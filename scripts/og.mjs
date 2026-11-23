// Renders 1200x630 Open Graph images for every story using headless Chromium,
// so Bangla conjuncts are shaped correctly with the Kalpurush web font.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OG_DIR = path.join(ROOT, "_site", "og");
const manifest = JSON.parse(fs.readFileSync(path.join(OG_DIR, "manifest.json"), "utf8"));
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s, n) => (!s ? "" : s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…");

// Optional local font override for offline testing: LOCAL_BN_FONT=/path/to/font.ttf
const localFont = process.env.LOCAL_BN_FONT
  ? `<style>@font-face{font-family:"Kalpurush";src:url(data:font/ttf;base64,${fs.readFileSync(process.env.LOCAL_BN_FONT).toString("base64")});}</style>`
  : `<link href="https://fonts.maateen.me/kalpurush/font.css" rel="stylesheet">`;

function page(item) {
  const title = clip(item.title, 70);
  const size = title.length > 40 ? 64 : title.length > 22 ? 80 : 96;
  const meta = item.home ? "" : [item.genre, item.minutes ? `${item.minutes} মিনিটের পাঠ` : "", item.date].filter(Boolean).join("  ·  ");
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8">${localFont}
<style>
  *{margin:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;background:#fff}
  body{font-family:"Times New Roman",Times,"Kalpurush",serif;color:#1a1a1a;padding:70px 84px;display:flex;flex-direction:column;position:relative}
  .frame{position:absolute;inset:28px;border:1.5px solid #e2dfd8}
  .top{display:flex;justify-content:space-between;align-items:baseline;font-size:28px;color:#6b6b6b}
  .top b{font-weight:normal;color:#8a2b1d;font-size:34px}
  .mid{flex:1;display:flex;flex-direction:column;justify-content:center}
  h1{font-weight:normal;font-size:${item.home ? 150 : size}px;line-height:1.28;letter-spacing:.005em}
  p{margin-top:22px;font-size:32px;line-height:1.55;color:#4a4a4a;max-width:960px}
  .bot{display:flex;justify-content:space-between;align-items:flex-end;font-size:24px;color:#6b6b6b}
  .ai{border:1px solid #d8d4cc;border-radius:99px;padding:4px 18px;font-size:22px}
  .rule{width:64px;height:3px;background:#8a2b1d;margin-bottom:28px}
</style></head><body>
<div class="frame"></div>
<div class="top"><b>${esc(manifest.site.title)}</b><span>${esc(meta)}</span></div>
<div class="mid"><div class="rule"></div><h1>${esc(title)}</h1>${item.subtitle ? `<p>${esc(clip(item.subtitle, item.home ? 80 : 120))}</p>` : ""}</div>
<div class="bot"><span>${esc(manifest.site.host)}</span><span class="ai">লিখেছে Claude · ভাবনা আদিব</span></div>
</body></html>`;
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const tab = await ctx.newPage();
let fontOk = true;
for (const item of manifest.items) {
  await tab.setContent(page(item), { waitUntil: "networkidle" });
  await tab.evaluate(async () => { await document.fonts.load('40px "Kalpurush"', "গল্প"); await document.fonts.ready; });
  const ok = await tab.evaluate(() => document.fonts.check('40px "Kalpurush"', "গল্প"));
  if (!ok) fontOk = false;
  await tab.screenshot({ path: path.join(OG_DIR, `${item.slug}.png`), type: "png" });
  console.log(`og: ${item.slug}.png${ok ? "" : " (WARNING: Kalpurush not loaded)"}`);
}
await browser.close();
fs.rmSync(path.join(OG_DIR, "manifest.json"));
if (!fontOk && process.env.CI) { console.error("Kalpurush font failed to load for OG images."); process.exit(1); }
