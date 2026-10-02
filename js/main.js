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

    /* Safety net: if the observer is slow or never fires, anything that has
       scrolled into view is shown anyway, so content can never stay hidden. */
    var pending = false;
    var sweep = function () {
      pending = false;
      var limit = window.innerHeight;
      revealables.forEach(function (el) {
        if (!el.classList.contains('is-visible') && !el.hidden && el.getBoundingClientRect().top < limit) {
          el.classList.add('is-visible');
          io.unobserve(el);
        }
      });
    };
    var queueSweep = function () {
      if (!pending) { pending = true; setTimeout(sweep, 250); }
    };
    window.addEventListener('scroll', queueSweep, { passive: true });
    window.addEventListener('resize', queueSweep);
    window.addEventListener('load', queueSweep);
    setTimeout(sweep, 1200);
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

/* ---------- Expressive layer (all optional, all gated) ---------- */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Headings: wrap each word so it can rise in on its own */
  function wrapWords(node, counter) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var parts = child.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (!part) { return; }
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var span = document.createElement('span');
          span.className = 'w';
          span.style.setProperty('--i', counter.n++);
          span.textContent = part;
          frag.appendChild(span);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && child.tagName !== 'SVG' && child.tagName !== 'svg') {
        wrapWords(child, counter);
      }
    });
  }
  if (!reduceMotion) {
    Array.prototype.forEach.call(document.querySelectorAll('h1'), function (h) { wrapWords(h, { n: 0 }); });
  }

  /* Staggered reveal inside grids */
  Array.prototype.forEach.call(document.querySelectorAll('.works'), function (grid) {
    Array.prototype.forEach.call(grid.querySelectorAll('.reveal'), function (el, i) {
      el.style.setProperty('--i', i % 6);
    });
  });

  /* Hero shelf parallax */
  var hero = document.querySelector('.hero');
  var shelf = document.querySelector('.shelf');
  if (hero && shelf && finePointer && !reduceMotion) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var px = ((e.clientX - r.left) / r.width - .5) * 2;
      var py = ((e.clientY - r.top) / r.height - .5) * 2;
      shelf.style.setProperty('--px', px.toFixed(3));
      shelf.style.setProperty('--py', py.toFixed(3));
    });
    hero.addEventListener('pointerleave', function () {
      shelf.style.setProperty('--px', 0);
      shelf.style.setProperty('--py', 0);
    });
  }

  /* Gallery cards tilt toward the cursor */
  if (finePointer && !reduceMotion) {
    Array.prototype.forEach.call(document.querySelectorAll('.work-link'), function (link) {
      var frame = link.querySelector('.work-frame');
      if (!frame) { return; }
      link.addEventListener('pointermove', function (e) {
        var r = frame.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5;
        var y = (e.clientY - r.top) / r.height - .5;
        frame.style.setProperty('--ry', (x * 12).toFixed(2) + 'deg');
        frame.style.setProperty('--rx', (-y * 12).toFixed(2) + 'deg');
      });
      link.addEventListener('pointerleave', function () {
        frame.style.removeProperty('--rx');
        frame.style.removeProperty('--ry');
      });
    });
  }

  /* Cursor ring */
  if (finePointer) {
    var ring = document.createElement('div');
    ring.className = 'cursor';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    var tx = -100, ty = -100, cx = -100, cy = -100, raf = null;
    var tick = function () {
      cx += (tx - cx) * .22;
      cy += (ty - cy) * .22;
      ring.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px) translate(-50%,-50%)';
      raf = (Math.abs(tx - cx) > .2 || Math.abs(ty - cy) > .2) ? requestAnimationFrame(tick) : null;
    };
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      ring.classList.add('is-on');
      if (!raf) { raf = requestAnimationFrame(tick); }
    });
    document.addEventListener('pointerleave', function () { ring.classList.remove('is-on'); });
    document.addEventListener('pointerover', function (e) {
      var art = e.target.closest('.work, .shelf-item, .art-figure, .palette a');
      if (art) {
        ring.classList.add('is-art');
        ring.style.setProperty('--accent', art.style.getPropertyValue('--accent') || 'var(--ink-soft)');
      } else {
        ring.classList.remove('is-art');
      }
    });
  }
})();
