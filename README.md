# Aphrona Beauty: LED light therapy landing site

A fast, static landing site that helps Aphrona Beauty win organic and AI-assisted discovery, and turns
visitors arriving from TikTok and Instagram into informed buyers. All purchases link out to the existing
Shopify store at [aphronabeauty.com](https://www.aphronabeauty.com); the store and checkout are untouched.

## What's here

| Page | Purpose |
|---|---|
| `/` | Scroll-driven 3D LED mask story (red → orange → blue → all three), "Saw it on TikTok?" answers, how-to, full device lineup, device finder, comparison table, FAQ |
| `/technology/` | Plain-English guide to every technology the brand sells: LED wavelengths, evidence, microcurrent, RF, LLLT, IPL, safety |
| `/faq/` | 19 questions grouped by results, safety, usage and orders |
| `/llms.txt` | Concise brand, product and fact summary written for AI assistants |
| `/robots.txt` | Allows search and AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.) |
| `/sitemap.xml` | Generated at build time |

### SEO and AI discovery

- Semantic HTML: one `h1` per page, landmarks, `details/summary` FAQs, real tables, breadcrumbs.
- JSON-LD on every page: `Organization`, `WebSite`, `WebPage`, six `Product`s with `Offer`s pointing to the store, `HowTo`, `FAQPage`, `Article`, `BreadcrumbList` and a `DefinedTermSet` glossary. The build fails if any JSON-LD block doesn't parse.
- Product `@id`s use the store's product URLs, so search engines connect this content to the Shopify product pages.
- Title, description, canonical, Open Graph and Twitter tags on every page, plus a 1200×630 `og.png`.
- Every outbound store link carries `utm_source=aphrona-learn&utm_medium=landing&utm_campaign=<section>` so Shopify analytics shows which section drove each sale.

### Performance

- All content is static HTML; nothing waits on JavaScript.
- The 3D scene (three.js, ~140 KB gzipped) loads only after the page is idle. Phones get a lower pixel ratio, no antialiasing and a smaller, top-anchored mask. It falls back to a CSS illustration without WebGL and respects `prefers-reduced-motion`.
- One self-hosted variable font (41 KB). Product images are lazy-loaded with fixed dimensions.

### About the 3D mask

There was no 3D file of the Halo mask, so `src/mask.js` builds a stand-in procedurally: a face-shaped shell
with smooth eye and mouth openings and LED points on both faces. The page says it is illustrative. To use a
real model, export the mask as GLB and replace `buildShell()` with a `GLTFLoader` call.

## Develop

```bash
npm install
npm run dev          # builds to dist/ and serves http://localhost:4173
SITE_URL=https://learn.aphronabeauty.com npm run build   # production URL for canonicals and sitemap
```

Scroll choreography lives in the HTML: any element with `data-mask="red|orange|blue|tri"` is a keyframe, with
optional `data-mask-x`, `-y`, `-rot`, `-tilt`, `-scale` and `-opacity`.

## Deploy

`.github/workflows/pages.yml` deploys `main` to GitHub Pages (enable Pages → "GitHub Actions" in repo settings).
For production, host `dist/` on a subdomain such as `learn.aphronabeauty.com` and set the `SITE_URL` repository
variable. The site can also be copied into a Shopify theme page if the brand prefers a single domain.

## Before launch, confirm with the brand

- Prices and stock (Golden Glow wand and Zenith were sold out on 2026-11-18) in the `Product` JSON-LD.
- Halo's exact wavelengths. Ranges on the site are typical LED values and are labelled as such.
- Warranty length and return window for each device.
- Product claims. Copy avoids clearance claims the store pages don't substantiate.

Fonts: Bricolage Grotesque, SIL Open Font License (`site/assets/fonts/OFL-bricolage-grotesque.txt`).
