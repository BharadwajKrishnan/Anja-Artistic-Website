/* Anja — site behaviour.
   Everything here is progressive enhancement: the pages work without it. */
(function () {
  'use strict';

  var EMAIL = 'anja.r@vanillaantalaha.com';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var label = toggle.querySelector('.nav-toggle-label');
    var setNav = function (open) {
      if (open) { nav.setAttribute('data-open', ''); } else { nav.removeAttribute('data-open'); }
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) { label.textContent = open ? 'Close' : 'Menu'; }
    };
    toggle.addEventListener('click', function () { setNav(!nav.hasAttribute('data-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) { setNav(false); } });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.hasAttribute('data-open')) { setNav(false); toggle.focus(); }
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealables = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (revealables.length && 'IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Inquiry links: keep the subject, add a short body with a link to the work ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('a[data-inquire]'), function (link) {
    var title = link.getAttribute('data-inquire');
    var slug = link.getAttribute('data-slug');
    var url = new URL('paintings.html#' + slug, location.href).href;
    var body = 'Hello Anja,\r\n\r\nI am interested in "' + title + '".\r\n' + url + '\r\n\r\n';
    link.href = 'mailto:' + EMAIL +
      '?subject=' + encodeURIComponent('Inquiry: ' + title) +
      '&body=' + encodeURIComponent(body);
  });

  /* ---------- Copy email ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (btn) {
    if (!navigator.clipboard) { return; }
    btn.hidden = false;
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(function () {
        var original = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = original; }, 2000);
      });
    });
  });

  /* ---------- Gallery filters ---------- */
  var works = Array.prototype.slice.call(document.querySelectorAll('.works--gallery .work'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-filter]'));
  var countEl = document.querySelector('.filter-count');

  function applyFilter(filter) {
    var shown = 0;
    works.forEach(function (work) {
      var match = filter === 'all' || work.getAttribute('data-category') === filter;
      work.hidden = !match;
      if (match) { shown += 1; }
    });
    chips.forEach(function (chip) {
      chip.setAttribute('aria-pressed', chip.getAttribute('data-filter') === filter ? 'true' : 'false');
    });
    if (countEl) { countEl.textContent = shown === 1 ? '1 work' : shown + ' works'; }
  }
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { applyFilter(chip.getAttribute('data-filter')); });
  });

  /* ---------- Lightbox ---------- */
  var dialog = document.getElementById('lightbox');
  if (!dialog || typeof dialog.showModal !== 'function' || !works.length) { return; }

  var els = {
    img: dialog.querySelector('#lightbox-img'),
    category: dialog.querySelector('#lightbox-category'),
    title: dialog.querySelector('#lightbox-title'),
    desc: dialog.querySelector('#lightbox-desc'),
    price: dialog.querySelector('#lightbox-price'),
    inquire: dialog.querySelector('#lightbox-inquire'),
    counter: dialog.querySelector('#lightbox-counter'),
    prev: dialog.querySelector('[data-lightbox-prev]'),
    next: dialog.querySelector('[data-lightbox-next]'),
    close: dialog.querySelector('[data-lightbox-close]')
  };
  var current = null;
  var pushed = false;
  var closingFromHistory = false;
  var returnFocus = null;

  function visibleWorks() {
    return works.filter(function (w) { return !w.hidden; });
  }

  function fill(work) {
    var d = work.dataset;
    var thumb = work.querySelector('img');
    var desc = work.querySelector('.work-desc');
    var inquire = work.querySelector('a[data-inquire]');
    els.img.src = d.image;
    els.img.width = d.width;
    els.img.height = d.height;
    els.img.alt = thumb ? thumb.alt : d.title;
    els.category.textContent = d.categoryLabel;
    els.title.textContent = d.title;
    els.desc.textContent = desc ? desc.textContent : '';
    els.price.textContent = d.price;
    if (inquire) { els.inquire.href = inquire.href; }
    dialog.style.setProperty('--accent', work.style.getPropertyValue('--accent') || 'var(--ink-soft)');

    var list = visibleWorks();
    var i = list.indexOf(work);
    if (els.counter) { els.counter.textContent = (i + 1) + ' of ' + list.length; }
    [list[(i + 1) % list.length], list[(i - 1 + list.length) % list.length]].forEach(function (n) {
      if (n && n !== work) { var pre = new Image(); pre.src = n.dataset.image; }
    });
  }

  function open(work, push) {
    if (work.hidden) { applyFilter('all'); }
    current = work;
    fill(work);
    if (!dialog.open) {
      if (!returnFocus) { returnFocus = document.activeElement; }
      dialog.showModal();
    }
    var hash = '#' + work.id;
    if (push) {
      if (location.hash !== hash) {
        history.pushState({ lightbox: work.id }, '', hash);
        pushed = true;
      }
    } else if (location.hash !== hash) {
      history.replaceState({ lightbox: work.id }, '', hash);
    }
    els.title.focus();
  }

  function step(dir) {
    if (!current) { return; }
    var list = visibleWorks();
    var i = list.indexOf(current);
    var next = list[(i + dir + list.length) % list.length];
    if (!next || next === current) { return; }
    current = next;
    fill(next);
    history.replaceState({ lightbox: next.id }, '', '#' + next.id);
  }

  works.forEach(function (work) {
    var link = work.querySelector('.work-link');
    if (!link) { return; }
    link.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
      e.preventDefault();
      returnFocus = link;
      open(work, true);
    });
  });

  els.prev.addEventListener('click', function () { step(-1); });
  els.next.addEventListener('click', function () { step(1); });
  els.close.addEventListener('click', function () { dialog.close(); });

  dialog.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  dialog.addEventListener('click', function (e) {
    var t = e.target;
    if (t === dialog || t.classList.contains('lightbox-tint') || t.classList.contains('lightbox-body')) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', function () {
    var wasPushed = pushed;
    pushed = false;
    if (closingFromHistory) {
      closingFromHistory = false;
    } else if (wasPushed) {
      history.back();
    } else if (location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }
    if (returnFocus && returnFocus !== document.body && typeof returnFocus.focus === 'function') {
      returnFocus.focus();
    }
    returnFocus = null;
    current = null;
  });

  window.addEventListener('popstate', function () {
    var id = location.hash.slice(1);
    var target = id ? document.getElementById(id) : null;
    if (target && works.indexOf(target) !== -1) {
      open(target, false);
    } else if (dialog.open) {
      closingFromHistory = true;
      dialog.close();
    }
  });

  /* Deep link: paintings.html#slug opens that work */
  var initialId = location.hash.slice(1);
  var initial = initialId ? document.getElementById(initialId) : null;
  if (initial && works.indexOf(initial) !== -1) { open(initial, false); }
})();
