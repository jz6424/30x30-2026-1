# Aphrona Beauty: LED light therapy landing site

A fast, static landing site that helps Aphrona Beauty win organic and AI-assisted discovery, and turns
visitors arriving from TikTok and Instagram into informed buyers. All purchases link out to the existing
Shopify store at [aphronabeauty.com](https://www.aphronabeauty.com); the store and checkout are untouched.

## What's here

| Page | Purpose |
|---|---|
| `/` | Halo story in the store's look: questions TikTok viewers ask, what each LED color does, how to use, full device lineup, device finder, comparison table, FAQ |
| `/studio/` | **Content Studio prototype.** One product spec in, on-brand TikTok script, Instagram carousel and SEO article with FAQ schema out, with brand-claim checks and a human approval step |
| `/technology/` | Plain-English guide to every technology the brand sells: LED wavelengths, evidence, microcurrent, RF, LLLT, IPL, safety |
| `/faq/` | 19 questions grouped by results, safety, usage and orders |
| `/llms.txt` | Concise brand, product and fact summary written for AI assistants |
| `/robots.txt` | Allows search and AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.) |
| `/sitemap.xml` | Generated at build time |

The hackathon write-up (problem, value, feasibility, assumptions, Converge.AI plan) is in [`docs/BUSINESS_CASE.md`](docs/BUSINESS_CASE.md).

### Content Studio

- `site/assets/brand.js` is the brand kit: voice rules, claim rules and product facts. Both the writer and the checks read it.
- `site/assets/studio.js` writes drafts with a built-in, offline engine, or with Claude if you open "Writing engine" and add an API key (kept in the browser tab only; move it behind a server for production).
- Medical or regulatory claims block approval; voice, length, SEO and tracking issues are flagged as suggestions. "Request changes" sends the reviewer's note back for a new draft.
- "Download approved pack" exports only approved pieces as Markdown, with the FAQ schema and the review log.

### SEO and AI discovery

- Semantic HTML: one `h1` per page, landmarks, `details/summary` FAQs, real tables, breadcrumbs.
- JSON-LD on every page: `Organization`, `WebSite`, `WebPage`, six `Product`s with `Offer`s pointing to the store, `HowTo`, `FAQPage`, `Article`, `BreadcrumbList` and a `DefinedTermSet` glossary. The build fails if any JSON-LD block doesn't parse.
- Product `@id`s use the store's product URLs, so search engines connect this content to the Shopify product pages.
- Title, description, canonical, Open Graph and Twitter tags on every page, plus a 1200×630 `og.png`.
- Every outbound store link carries `utm_source=aphrona-learn&utm_medium=landing&utm_campaign=<section>` so Shopify analytics shows which section drove each sale.

### Look and performance

- Styled to match aphronabeauty.com: Halant serif headings, Plus Jakarta Sans body text (both SIL Open Font License, self-hosted), off-white page, black square buttons and the store's own product photography.
- All content is static HTML; the only scripts are the device finder and the studio. Product images are lazy-loaded with fixed dimensions.

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

Fonts: Halant and Plus Jakarta Sans, SIL Open Font License (`site/assets/fonts/`).
The earlier 3D mask model is kept for reference in `docs/model/` but no longer ships with the site.
