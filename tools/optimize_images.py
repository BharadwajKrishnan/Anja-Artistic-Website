#!/usr/bin/env python3
"""Prepare Anja's artwork photos for the website.

Usage:
    python3 tools/optimize_images.py /path/to/folder/with/original/photos

For every entry in ARTWORKS it writes
    images/artworks/<slug>.jpg        1600px on the long edge (lightbox)
    images/artworks/<slug>-thumb.jpg   800px on the long edge (gallery cards)
keeps the photo's colour profile, samples one accent colour from the painting
(used for its tinted shadow on the site), writes images/artworks/manifest.json
and builds images/og.jpg, the 1200x630 preview shown when the site is shared.

Needs Pillow:  python3 -m pip install pillow
"""
import colorsys
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageOps

# (source photo, slug). Order here is the order used on the gallery page.
ARTWORKS = [
    ("3.jpg", "evening-table"),
    ("2.jpg", "pear-and-red-bowl"),
    ("6.jpg", "study-in-grey"),
    ("9.jpg", "blue-sphere"),
    ("4.jpg", "clouds-over-the-valley"),
    ("8.jpg", "skyline-at-dusk"),
    ("12.jpg", "blue-hills"),
    ("5.jpg", "current"),
    ("10.jpg", "quilt-star"),
    ("11.jpg", "arches"),
    ("7.jpg", "blue-lily"),
    ("13.jpg", "two-tulips"),
]

# Hand-picked accent colours win over the sampled one when present.
ACCENT_OVERRIDES = {
    "evening-table": "#ef8f2c",          # candle orange
    "pear-and-red-bowl": "#9e2b2b",      # the red bowl
    "study-in-grey": "#8f7f6a",          # warm taupe
    "blue-sphere": "#3f4d7a",            # indigo wash
    "clouds-over-the-valley": "#3b5db0", # sky blue
    "skyline-at-dusk": "#f28a3d",        # sunset orange
    "blue-hills": "#6b6fb5",             # periwinkle
    "current": "#3f7f8f",                # teal
    "quilt-star": "#e3162a",             # scarlet
    "arches": "#f98104",                 # orange arch
    "blue-lily": "#4db3c6",              # turquoise petals
    "two-tulips": "#d8536a",             # tulip pink
}

# Fractions to trim from (left, top, right, bottom) where the photo caught
# the table or shelf behind the artwork.
CROP = {
    "blue-lily": (0.025, 0.012, 0.02, 0.0),
    "blue-sphere": (0.028, 0.018, 0.022, 0.015),
    "clouds-over-the-valley": (0.028, 0.012, 0.0, 0.0),
}

LARGE = 1600
THUMB = 800
QUALITY = 82
PAPER = (0xF7, 0xF5, 0xFB)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "images", "artworks")


def load(path):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    icc = im.info.get("icc_profile")
    return im.convert("RGB"), icc


def crop(im, slug):
    frac = CROP.get(slug)
    if not frac:
        return im
    w, h = im.size
    left, top, right, bottom = frac
    return im.crop((round(w * left), round(h * top), w - round(w * right), h - round(h * bottom)))


def resize(im, long_edge):
    w, h = im.size
    scale = long_edge / max(w, h)
    if scale >= 1:
        return im.copy()
    return im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)


def save_jpeg(im, path, icc):
    kwargs = dict(quality=QUALITY, optimize=True, progressive=True)
    if icc:
        kwargs["icc_profile"] = icc
    im.save(path, "JPEG", **kwargs)


def sample_accent(im):
    """Pick a colour that is both present and vivid, skipping near-white/black."""
    small = im.copy()
    small.thumbnail((96, 96))
    q = small.quantize(colors=10, method=Image.Quantize.MEDIANCUT)
    palette = q.getpalette()
    counts = q.getcolors()
    total = sum(c for c, _ in counts)
    best, best_score = None, -1
    for count, idx in counts:
        r, g, b = palette[idx * 3: idx * 3 + 3]
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if v < 0.18 or (v > 0.92 and s < 0.12):
            continue
        share = count / total
        score = (share ** 0.35) * (s ** 1.2) * (0.3 + v)
        if score > best_score:
            best, best_score = (r, g, b), score
    if best is None:
        best = (0x5E, 0x5A, 0x78)
    return "#%02x%02x%02x" % best


def build_og(art, accent_hex, out_path):
    """Painting centred on paper with its tinted shadow, 1200x630."""
    W, H = 1200, 630
    art = resize(art, 10000)
    aw, ah = art.size
    scale = min(520 / ah, 640 / aw)
    art = art.resize((round(aw * scale), round(ah * scale)), Image.LANCZOS)
    aw, ah = art.size
    x, y = (W - aw) // 2, (H - ah) // 2
    rgb = tuple(int(accent_hex[i:i + 2], 16) for i in (1, 3, 5))
    canvas = Image.new("RGBA", (W, H), PAPER + (255,))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle([x + 18, y + 26, x + 18 + aw, y + 26 + ah], fill=rgb + (120,))
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    canvas = Image.alpha_composite(canvas, shadow)
    canvas.paste(art, (x, y))
    canvas.convert("RGB").save(out_path, "JPEG", quality=86, optimize=True, progressive=True)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src_dir = sys.argv[1]
    os.makedirs(OUT_DIR, exist_ok=True)
    manifest = []
    for src_name, slug in ARTWORKS:
        src = os.path.join(src_dir, src_name)
        im, icc = load(src)
        im = crop(im, slug)
        large = resize(im, LARGE)
        thumb = resize(im, THUMB)
        save_jpeg(large, os.path.join(OUT_DIR, slug + ".jpg"), icc)
        save_jpeg(thumb, os.path.join(OUT_DIR, slug + "-thumb.jpg"), icc)
        accent = ACCENT_OVERRIDES.get(slug) or sample_accent(large)
        entry = {
            "slug": slug,
            "source": src_name,
            "width": large.size[0],
            "height": large.size[1],
            "thumbWidth": thumb.size[0],
            "thumbHeight": thumb.size[1],
            "orientation": "landscape" if large.size[0] > large.size[1] else "portrait",
            "accent": accent,
        }
        manifest.append(entry)
        print(f"{slug:24} {entry['width']}x{entry['height']}  thumb {entry['thumbWidth']}x{entry['thumbHeight']}  accent {accent}  icc={'yes' if icc else 'no'}")
        if slug == ARTWORKS[0][1]:
            build_og(large, accent, os.path.join(ROOT, "images", "og.jpg"))
    with open(os.path.join(OUT_DIR, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nWrote {len(manifest)} artworks to {OUT_DIR}")


if __name__ == "__main__":
    main()
