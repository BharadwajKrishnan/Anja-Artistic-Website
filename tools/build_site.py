#!/usr/bin/env python3
"""Build the gallery from artworks.json and prices.json.

Usage:
    python3 tools/build_site.py            # normal run
    python3 tools/build_site.py --force    # also re-make images that already exist

What it does
  1. For every artwork in artworks.json that has an "original" photo, makes
     images/artworks/<slug>.jpg (up to 1600px, for the enlarged view) and
     <slug>-thumb.webp (up to 1000px, for cards), applying the optional "crop" (fractions trimmed from left, top,
     right, bottom) and keeping the photo's colour profile.
  2. Rewrites the gallery cards in paintings.html, the palette on about.html,
     the work counts, and the prices (from prices.json; null shows
     "Price coming soon").

Needs Pillow:  python3 -m pip install pillow
"""
import html
import json
import os
import re
import sys

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "images", "artworks")
EMAIL = "anja.r@vanillaantalaha.com"
PLACEHOLDER = "Price coming soon"
LARGE, THUMB, QUALITY = 1600, 1000, 82
THUMB_QUALITY = 78
CATEGORIES = {
    "still-life": "Still Life",
    "landscape": "Landscape",
    "abstract": "Abstract",
    "flowers": "Flowers",
    "figures": "Figures",
    "drawings": "Drawings",
}
NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
                "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]


def words(n):
    if n < 20:
        return NUMBER_WORDS[n]
    if n < 100:
        return TENS[n // 10] + ("-" + NUMBER_WORDS[n % 10] if n % 10 else "")
    return str(n)


def path(*parts):
    return os.path.join(ROOT, *parts)


def resize(im, long_edge):
    w, h = im.size
    scale = long_edge / max(w, h)
    if scale >= 1:
        return im.copy()
    return im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)


def make_images(work, force):
    large_path = os.path.join(IMG_DIR, work["slug"] + ".jpg")
    thumb_path = os.path.join(IMG_DIR, work["slug"] + "-thumb.webp")
    original = work.get("original")
    if original and os.path.exists(path(original)) and (force or not os.path.exists(large_path)):
        im = ImageOps.exif_transpose(Image.open(path(original)))
        icc = im.info.get("icc_profile")
        im = im.convert("RGB")
        if work.get("crop"):
            left, top, right, bottom = work["crop"]
            w, h = im.size
            im = im.crop((round(w * left), round(h * top), w - round(w * right), h - round(h * bottom)))
        kwargs = dict(quality=QUALITY, optimize=True, progressive=True)
        if icc:
            kwargs["icc_profile"] = icc
        resize(im, LARGE).save(large_path, "JPEG", **kwargs)
        force = True
    if not os.path.exists(large_path):
        sys.exit("Missing image for %s: add an original photo or images/artworks/%s.jpg" % (work["slug"], work["slug"]))
    if force or not os.path.exists(thumb_path):
        # The card thumbnail is always made from the large image.
        im = Image.open(large_path)
        icc = im.info.get("icc_profile")
        kwargs = dict(quality=THUMB_QUALITY, method=6)
        if icc:
            kwargs["icc_profile"] = icc
        resize(im.convert("RGB"), THUMB).save(thumb_path, "WEBP", **kwargs)
    with Image.open(large_path) as a, Image.open(thumb_path) as b:
        return a.size, b.size


def card(work, price, eager):
    e = html.escape
    slug, title = work["slug"], work["title"]
    (w, h), (tw, th) = work["size"], work["thumb"]
    landscape = w / h > 1.15
    label = CATEGORIES[work["category"]]
    subject = "Inquiry%3A%20" + re.sub(r"%2C", "%2C", html.escape(title)).replace(" ", "%20").replace(",", "%2C")
    loading = 'fetchpriority="high"' if eager else 'loading="lazy"'
    return f'''
        <article class="work{' work--landscape' if landscape else ''} reveal" id="{slug}" data-category="{work['category']}" data-category-label="{label}" data-title="{e(title)}" data-image="images/artworks/{slug}.jpg" data-width="{w}" data-height="{h}" data-price="{e(price)}" style="--accent:{work['accent']}">
          <a class="work-link" href="images/artworks/{slug}.jpg">
            <div class="work-frame">
              <img src="images/artworks/{slug}-thumb.webp" width="{tw}" height="{th}" alt="{e(work['alt'])}" {loading} decoding="async">
            </div>
            <h3 class="work-title">{e(title)}</h3>
          </a>
          <p class="work-meta"><span><i class="work-swatch" aria-hidden="true"></i>{label}</span><span class="work-price">{e(price)}</span></p>
          <p class="work-desc">{e(work['description'])}</p>
          <p class="work-actions"><a class="btn btn--ghost btn--small" href="mailto:{EMAIL}?subject={subject}" data-inquire="{e(title)}" data-slug="{slug}">Buy this painting</a></p>
        </article>
'''


def between(text, start, end, replacement, name):
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if not pattern.search(text):
        sys.exit("Markers for %s not found" % name)
    return pattern.sub(lambda m: start + replacement + end, text, count=1)


def main():
    force = "--force" in sys.argv
    works = json.load(open(path("artworks.json")))
    prices = json.load(open(path("prices.json")))
    for work in works:
        work["size"], work["thumb"] = make_images(work, force)
    count = len(works)
    subjects = len({w["category"] for w in works})

    # paintings.html
    p = path("paintings.html")
    s = open(p).read()
    cards = "".join(card(w, prices.get(w["slug"]) or PLACEHOLDER, i < 3) for i, w in enumerate(works))
    s = between(s, "<!-- works:start -->", "<!-- works:end -->", "\n" + cards + "\n        ", "gallery")
    s = re.sub(r'(<p class="filter-count" aria-live="polite">)\d+ works(</p>)', r"\g<1>%d works\g<2>" % count, s)
    s = re.sub(r"<h1>.*?</h1>", '<h1>%s works, <span class="mark" style="--accent:#e3162a">%s subjects</span></h1>'
               % (words(count).capitalize(), words(subjects)), s, count=1, flags=re.S)
    open(p, "w").write(s)

    # about.html palette
    p = path("about.html")
    s = open(p).read()
    swatches = "\n".join(
        '            <li><a href="paintings.html#%s" style="--accent:%s" title="%s"><span class="visually-hidden">%s</span></a></li>'
        % (w["slug"], w["accent"], html.escape(w["title"]), html.escape(w["title"])) for w in works)
    s = between(s, "<!-- palette:start -->", "<!-- palette:end -->", "\n" + swatches + "\n          ", "palette")
    open(p, "w").write(s)

    # Hand-written images on the other pages: point them at the current thumbnails
    for page in ("index.html", "about.html", "contact.html"):
        p = path(page)
        s = open(p).read()
        for work in works:
            slug = work["slug"]
            (w, h), (tw, th) = work["size"], work["thumb"]

            def fix(m):
                tag = re.sub(r"%s-thumb\.(?:jpg|webp)" % re.escape(slug), slug + "-thumb.webp", m.group(0))
                tag = re.sub(r"(%s-thumb\.webp) \d+w" % re.escape(slug), r"\g<1> %dw" % tw, tag)
                tag = re.sub(r"(%s\.jpg) \d+w" % re.escape(slug), r"\g<1> %dw" % w, tag)
                tag = re.sub(r'width="\d+"', 'width="%d"' % tw, tag)
                return re.sub(r'height="\d+"', 'height="%d"' % th, tag)

            s = re.sub(r"<img [^>]*%s-thumb\.(?:jpg|webp)[^>]*>" % re.escape(slug), fix, s)
        open(p, "w").write(s)

    # index.html: count and featured prices
    p = path("index.html")
    s = open(p).read()
    s = re.sub(r"All \d+ works", "All %d works" % count, s)
    for work in works:
        price = prices.get(work["slug"]) or PLACEHOLDER
        pattern = re.compile(r'(href="paintings\.html#%s">(?:(?!</article>).)*?<span class="work-price">)[^<]*(</span>)' % re.escape(work["slug"]), re.S)
        s = pattern.sub(lambda m: m.group(1) + html.escape(price) + m.group(2), s, count=1)
    open(p, "w").write(s)

    print("Built %d works in %d subjects" % (count, subjects))


if __name__ == "__main__":
    main()
