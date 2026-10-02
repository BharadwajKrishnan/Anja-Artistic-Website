# Anja — paintings and drawings

A static website for Anja to show her paintings and let visitors ask about buying one.
Plain HTML, CSS, and JavaScript. No build step, no framework, no backend.

## Pages

| File | Page |
|---|---|
| `index.html` | Home |
| `paintings.html` | Paintings and Drawings (gallery with filters and a lightbox) |
| `about.html` | About Me |
| `contact.html` | Contact |

Shared files: `css/styles.css`, `js/main.js`, `artworks.json` and `prices.json` (the artwork data), `tools/build_site.py` (generates the gallery), `images/artworks/` (per work: a 1600px JPEG for the enlarged view and a light WebP thumbnail for cards), `originals/` (the source photos), `images/og.jpg` (link preview), `favicon.svg`.

## Run it locally

Any static file server works. From this folder:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. Opening `index.html` directly from Finder also works, but the lightbox deep links behave best over a server.

## Add a new artwork

All artwork details live in `artworks.json`. The gallery cards are generated from it, so nothing has to be copied by hand.

1. Put the photo in the `originals/` folder, named after the work, for example `originals/red-barn.jpeg`.
2. Add an entry to `artworks.json` where you want it to appear in the gallery:

   ```json
   {
     "slug": "red-barn",
     "title": "Red Barn",
     "category": "landscape",
     "accent": "#b8322a",
     "description": "Two sentences about the work.",
     "alt": "Red Barn: a short visual description",
     "original": "originals/red-barn.jpeg",
     "crop": [0.02, 0.0, 0.03, 0.0]
   }
   ```

   `accent` is the colour of the work's shadow. `crop` is optional: the fraction to trim from the left, top, right, and bottom when the photo shows the table or wall behind the work.
3. Add a line for it in `prices.json`.
4. Run the build:

   ```bash
   python3 tools/build_site.py
   ```

   It makes the web-sized images and rewrites the gallery, the palette on the About page, and the work counts. Add `--force` to re-make images after changing a crop.
5. To feature it on the home page, copy one of the cards in the "Selected works" section of `index.html`.

The first twelve works have no file in `originals/`; their web images are already in `images/artworks/`.

## Set the prices

Prices live in `prices.json`, one line per artwork:

```json
"evening-table": "$450",
```

Put the price text you want shown, then run `python3 tools/build_site.py`. A `null` value shows "Price coming soon".

## Categories

The filter buttons match the `category` value of each work: `still-life`, `landscape`, `abstract`, `flowers`, `figures`, `drawings`. To add a category, add it to `CATEGORIES` in `tools/build_site.py` and add a button in the `filters` block of `paintings.html`.

## Contact details

The email and phone number appear in the header band on the home page, the contact page, the footer of every page, and the lightbox. Search the files for `anja.r@vanillaantalaha.com` and `+12486069008` to change them. The inquiry buttons build their email subject from the work's title automatically.

## Deploy

The whole folder can be uploaded as-is.

- **Netlify**: drag the folder onto app.netlify.com/drop.
- **Vercel**: run `vercel` in this folder, or import it from a Git repository.
- **GitHub Pages**: push to a repository and enable Pages for the root folder.

After the site has a domain, change `og:image` in each page's `<head>` to the full address (for example `https://example.com/images/og.jpg`) so shared links show the preview image.

## Motion and decoration

The washes drifting behind each page, the paper grain, the brushstroke and word-by-word entrance in the home headline, the scrolling ribbon, the tilt on gallery cards, the cursor ring, and the colour bloom when a work opens are all defined in `css/styles.css` (the "Expressive layer" section) and the last block of `js/main.js`. Every animation is skipped automatically for visitors who have "reduce motion" switched on, and the cursor effects only run on devices with a mouse or trackpad.

## Fonts

Archivo and Newsreader load from Google Fonts. Without internet access the site falls back to Arial and Georgia.
