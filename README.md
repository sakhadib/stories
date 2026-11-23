# গল্প — আদিবের ভাবনা, Claude-এর কলম

বাংলা দীর্ঘ গল্পের সংকলন। প্রতিটি গল্পের ভাবনা আদিব সাখাওয়াতের, আর লিখেছে Claude (Anthropic-এর এআই)। এটা প্রতিটি পাতায় খোলাখুলি জানানো থাকে।

Long-form Bangla fiction written by Claude (Anthropic) from ideas by Adib Sakhawat. AI authorship is disclosed on every page.

**Read:** https://sakhadib.github.io/stories/

## How it works
- Each story is a Markdown file in `stories/` with SEO front matter (see `stories/_template.md`).
- Pushing to `main` runs `.github/workflows/deploy.yml`: build static pages → render OG images → deploy to GitHub Pages.

```bash
npm install
npm run build        # -> _site/
npm run og           # OG images (needs Chromium: npx playwright install chromium)
```
