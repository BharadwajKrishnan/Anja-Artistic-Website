#!/usr/bin/env python3
"""Write the prices from prices.json into the site.

Usage:
    python3 tools/set_prices.py

prices.json maps each artwork slug to its price text, for example
    "evening-table": "$450"
A null value shows the placeholder "Price coming soon". The script updates
the gallery cards in paintings.html (which also feed the lightbox) and the
featured cards on index.html.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLACEHOLDER = "Price coming soon"


def main():
    prices = json.load(open(os.path.join(ROOT, "prices.json")))
    changed = 0

    path = os.path.join(ROOT, "paintings.html")
    html = open(path).read()
    for slug, price in prices.items():
        text = price or PLACEHOLDER
        pattern = re.compile(r'(<article class="work[^"]*" id="%s"[^>]*?)data-price="[^"]*"(.*?)<span class="work-price">[^<]*</span>' % re.escape(slug), re.S)
        html, n = pattern.subn(lambda m: '%sdata-price="%s"%s<span class="work-price">%s</span>' % (m.group(1), text, m.group(2), text), html, count=1)
        changed += n
        if not n:
            print("warning: %s not found in paintings.html" % slug)
    open(path, "w").write(html)

    path = os.path.join(ROOT, "index.html")
    html = open(path).read()
    for slug, price in prices.items():
        text = price or PLACEHOLDER
        pattern = re.compile(r'(href="paintings\.html#%s">.*?<span class="work-price">)[^<]*(</span>)' % re.escape(slug), re.S)
        html, n = pattern.subn(lambda m: m.group(1) + text + m.group(2), html, count=1)
        changed += n
    open(path, "w").write(html)
    print("updated %d price fields" % changed)


if __name__ == "__main__":
    main()
