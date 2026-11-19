# Aphrona Content Studio: business case

Converge.AI "We Mean Business" challenge 01 · Artistic / Aphrona Beauty · Stanford, November 20, 2026

## The problem

Aphrona Beauty sells LED masks, microcurrent and skin-tightening devices priced from about $50 to $370. Instagram and TikTok bring in attention, but few of those viewers go on to buy. Three reasons stand out:

1. **The website doesn't help people find the products or understand them.** Most product and education content is several years old. It wasn't written for search engines or AI assistants, so people who search "do LED masks work" or ask ChatGPT which mask to buy rarely land on Aphrona.
2. **Expensive devices need explaining, and social posts don't explain.** A $196 mask raises questions before anyone buys it: does it work, is it safe for my skin, how long until I see results? Short videos create interest but leave those questions unanswered.
3. **Every piece of content is made by hand, one channel at a time.** The same product knowledge is rewritten separately for TikTok, Instagram and the website. That takes time, the brand voice drifts, and claims aren't checked consistently.

Without organic discovery, Aphrona has to keep buying traffic through Google Ads.

## What we built

**1. A content studio (direction #2: brand-guided multi-channel workflow).** `/studio/`

- **Input:** pick a device or paste a product spec, then choose an angle such as "Saw it on TikTok", "Night routine" or "Gift guide".
- **Drafts:** one click writes a TikTok script with on-screen text and timings, an Instagram carousel with caption and alt text, and a search-ready website article. The article includes FAQs and the Article and FAQPage structured data that Google and AI assistants read.
- **Brand checks:** each draft is checked against Aphrona's brand kit. Medical and regulatory claims (cure, FDA approved, clinically proven) block approval. Hype words, missing disclaimers, untracked links, title and meta length, and missing FAQs are flagged as suggestions.
- **Human approval:** a reviewer edits, requests changes (which sends the note back to the writer for a new draft) or approves. Nothing can be exported until it's approved, and every action is logged.
- **Export:** one Markdown pack of the approved pieces, with schema ready to paste and UTM-tagged store links so Shopify can attribute each sale to its post.

**2. A rebuilt learning site (direction #1: AI-discoverable content).** `/`, `/technology/`, `/faq/`

- Restyled to match aphronabeauty.com: Halant serif headings, off-white page, black buttons and real product photography.
- Answers the questions a TikTok viewer has before buying, explains each LED color, compares the masks and recommends a device by skin concern.
- Static HTML with JSON-LD for Product, FAQPage, HowTo and Article, plus a `/llms.txt` summary written for AI assistants and a robots.txt that welcomes AI crawlers.
- Every buy button links to the existing Shopify store with UTM tags. Shopify and checkout are untouched.

The studio and the site are connected: the website articles the studio writes are new pages for this site, so each approved article adds to Aphrona's search footprint.

## Expected value

| Goal in the brief | How this moves it | How to measure it |
|---|---|---|
| More organic customer acquisition | Answer-style pages with FAQ schema for the questions buyers actually search; an AI-readable summary in llms.txt | Non-paid sessions, search impressions and clicks (Search Console), AI-assistant referrals and mentions, click-through to product pages |
| Faster content with a consistent voice | One spec becomes three channel drafts in seconds; the brand checks enforce voice and claim rules on every draft | Time from brief to approved post, posts published per week, approval rate on first draft, number of edits per piece |
| More confident buyers | Clear explanations of how each device works, honest results timelines, comparisons and a device finder | Time on educational pages, path from guide to product page, add-to-cart and assisted conversions from `utm_source=aphrona-learn` and social UTM tags |
| Less dependence on Google Ads | Organic and AI-assistant traffic replaces part of the paid traffic | Paid share of new-customer orders, blended customer acquisition cost |

**Rough time math (assumption, to validate with the team):** writing a TikTok script, an Instagram carousel and an SEO article by hand for one product takes a marketer roughly 3 to 4 hours. With the studio, review and edits take about 20 to 30 minutes. At four product stories a month, that frees 10 to 14 hours a month for filming and community work.

## Feasibility

- **Works today:** the studio and site are static files on GitHub Pages, with no server and no changes to Shopify. The built-in engine runs offline, so a live demo never depends on a network call.
- **AI writing:** the studio can also write with Claude using the same brand kit as context. A production version would keep the API key on a server instead of in the browser.
- **Low risk:** humans approve everything. Claims rules come from one file (`site/assets/brand.js`) that marketing or compliance can edit.
- **Effort to production:** about 2 to 3 weeks. That covers confirming product facts and the claims list with Aphrona, moving generation behind a small server endpoint, and publishing approved articles to `/guides/` on this site or as Shopify blog posts.

## Key assumptions

- Product facts in the brand kit match the store pages as of November 18, 2026. Halo's exact wavelengths, warranty terms and stock still need confirming with the brand.
- Buyers of $150+ devices research before buying, and searches and AI-assistant questions are a growing part of that research.
- Aphrona's team will review drafts before they're published. The workflow is built around that step, not around full automation.
- Shopify analytics can report on UTM parameters, so content-driven sales can be attributed.

## Building it on Converge.AI (required for submission)

The brief only accepts solutions built with Converge.AI products. This prototype was built in a code repository and still has to be rebuilt on Converge. Here's the plan for each product:

| Converge product | Role in this workflow |
|---|---|
| **Enter** | Build and host the studio web app and the learning site. Enter's built-in AI replaces the browser API call. |
| **Framia** | Turn the approved TikTok script and carousel slides into actual video, images and voiceover using the brand assets. |
| **Covey** | The team workspace: the brand kit and product specs live here, and Covey agents route drafts to the reviewer for approval. |
| **Concat** (when available) | The content performance loop (direction #3): pull engagement and UTM conversion data and suggest the next topics to write. |

## Broader application

The same pattern (one source of product truth, channel-specific drafts, automated rule checks, human approval, tracked links) fits any business that sells considered purchases and relies on explanation: other beauty-device brands, supplements, home fitness equipment and consumer electronics. Within Artistic, it extends to the Avorla brand and to the hair regrowth and hair removal ranges by adding their specs to the brand kit.

## Next steps

1. Confirm product facts and the claims list with Yvonne Chen.
2. Rebuild the studio in Enter and connect Framia for video.
3. Publish the first four guides (Halo, Moonlight Pro, SuperNova, "Do LED masks work?") and submit the sitemap to Google Search Console.
4. Add the performance loop: weekly engagement and UTM data in, topic suggestions out.
