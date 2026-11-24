# sakhadib/stories — Bangla long-form fiction, written by Claude

Adib gives a story idea; Claude writes the full story as one Markdown file in `stories/`, commits, and pushes to `main`. GitHub Actions builds and deploys to Pages (https://sakhadib.github.io/stories/). AI authorship is disclosed on every page automatically — never remove that.

## Adding a story
1. Copy `stories/_template.md` to `stories/<slug>.md` (files starting with `_` are ignored).
2. Fill front matter. Required: `title`, `slug`, `description`, `date`. Strongly recommended: `genre`, `tags`, `keywords`, `excerpt`, `model`.
   - `slug`: lowercase ASCII, hyphens (a romanised title, e.g. `brishtir-pore-shohor`). It is the URL; never change it after publishing.
   - `description`: ~150–160 characters, Bangla, no spoilers of the ending. Used for Google, OG, WhatsApp/Facebook previews.
   - `keywords`: mix Bangla and English search terms.
   - `updated`: set when revising a published story.
   - `draft: true` hides a story.
3. Body: `##` = chapter heading (3+ chapters auto-build a table of contents), `***` = scene break, `>` = letters/quoted text. Don't add an H1; the title is rendered from front matter.
4. `npm run build` locally to validate (fails on bad/duplicate slugs or missing titles). Commit with a message like `story: <title>` and push.

## Writing guidelines
- Long form: aim for 4,000–10,000+ words unless Adib asks otherwise; split into chapters.
- Natural, literary চলিত Bangla. Correct conjuncts and spelling; Bangla numerals in prose; dialogue with Bangla quotation conventions.
- Show, don't tell; concrete Bangladeshi settings and texture where it fits the idea.
- Keep to Adib's idea; ask only if the idea is genuinely ambiguous about something load-bearing.
- Default voice is Humayun Ahmed's: short sentences, short paragraphs, dialogue-led, humour inside tense moments.
- Adib's notes on the first story (keep applying these):
  - No moral lesson. Purposelessness is a strength; endings don't need to resolve into meaning.
  - Don't over-explain a scene or a feeling. Build it, then trust the reader to imagine it. Cut narrator asides that spell out what a moment means.
  - Keep registers apart: narration in standard চলিত, dialogue in local/colloquial speech. Avoid colloquial words leaking into narration and bookish words leaking into dialogue.
- Adib's notes on the second story:
  - Adib's text is a situation brief, not an opening to reuse. Don't start with it verbatim; open on a scene and reveal backstory only at the moment it's needed.
  - Grassroots characters (rickshaw pullers, helpers, vendors, domestic workers) speak with casual slang and throwaway curses (বাল, শালা, হালার পুত…) that aren't aimed at anyone. Use it naturally, without overdoing it; educated characters stay clean.

## Site internals
- `scripts/build.mjs` — Markdown → static HTML in `_site/` (per-story pages, home, about, 404, RSS `feed.xml`, `sitemap.xml`, `robots.txt`, JSON-LD, OG/Twitter meta).
- `scripts/og.mjs` — renders 1200×630 OG PNGs with headless Chromium + Kalpurush (`_site/og/<slug>.png`). Locally: `CHROME_PATH=... LOCAL_BN_FONT=font.woff2 npm run og`.
- `site.config.json` — site title, URL, basePath. If a custom domain is added, change `url` and set `basePath` to `""`.
- `src/style.css`, `src/site.js` — white editorial theme; Times for Latin, Kalpurush for Bangla. Avoid `letter-spacing` and `::first-letter` on Bangla text (breaks conjunct shaping).
