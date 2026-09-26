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

Shared files: `css/styles.css`, `js/main.js`, `images/artworks/` (one 1600px and one 800px JPEG per work), `images/og.jpg` (link preview), `favicon.svg`.

## Run it locally

Any static file server works. From this folder:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. Opening `index.html` directly from Finder also works, but the lightbox deep links behave best over a server.

## Add a new artwork

1. Put the photo of the painting in a folder on your computer.
2. In `tools/optimize_images.py`, add a line to `ARTWORKS`, for example `("my-photo.jpg", "red-barn")`. The slug (second value) becomes the file name and the link, so use lowercase letters and hyphens.
3. Optionally add a colour for its shadow to `ACCENT_OVERRIDES`; otherwise one is sampled from the painting.
4. Run the script, pointing it at that folder:

   ```bash
   python3 tools/optimize_images.py /path/to/that/folder
   ```

   It writes the two JPEGs and prints the width, height, and accent colour. `images/artworks/manifest.json` keeps the same numbers.
5. In `paintings.html`, copy one `<article class="work …">` block, paste it where you want the work to appear, and replace the slug, title, category, description, alt text, dimensions, and `--accent`. For a landscape-format painting add the `work--landscape` class.
6. To feature it on the home page, copy one of the cards in the "Selected works" section of `index.html`.

## Set a price

Each card shows "Price on request" in two places: the `data-price` attribute on the `<article>` (used by the lightbox) and the `<span class="work-price">` inside it. Change both to the price, for example `$450`.

## Categories

The filter buttons match the `data-category` value on each card: `still-life`, `landscape`, `abstract`, `flowers`. To add a category, add a button in the `filters` block and use the new value on the cards.

## Contact details

The email and phone number appear in the header band on the home page, the contact page, the footer of every page, and the lightbox. Search the files for `anja.r@vanillaantalaha.com` and `+12486069008` to change them. The inquiry buttons build their email subject from the work's title automatically.

## Deploy

The whole folder can be uploaded as-is.

- **Netlify**: drag the folder onto app.netlify.com/drop.
- **Vercel**: run `vercel` in this folder, or import it from a Git repository.
- **GitHub Pages**: push to a repository and enable Pages for the root folder.

After the site has a domain, change `og:image` in each page's `<head>` to the full address (for example `https://example.com/images/og.jpg`) so shared links show the preview image.

## Fonts

Archivo and Newsreader load from Google Fonts. Without internet access the site falls back to Arial and Georgia.
