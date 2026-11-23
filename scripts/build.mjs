// Static site builder: stories/*.md (front matter) -> _site/
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Marked } from "marked";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "_site");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const BASE = (cfg.basePath || "").replace(/\/$/, "");
const ORIGIN = cfg.url.replace(/\/$/, "");
const abs = (p = "/") => ORIGIN + BASE + p;
const rel = (p = "/") => BASE + p;
const BUILD_TIME = new Date();

// ---------- helpers ----------
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const bnDigits = (s) => String(s).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const bnDate = (d) => new Intl.DateTimeFormat("bn-BD", { dateStyle: "long", timeZone: "Asia/Dhaka" }).format(d);
const isoDate = (d) => d.toISOString();
const toDate = (v) => (v instanceof Date ? v : v ? new Date(v) : null);
const stripMd = (s) => s.replace(/<[^>]+>/g, " ").replace(/[#>*_`\[\]()!-]/g, " ").replace(/\s+/g, " ").trim();
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…");
const asList = (v) => (Array.isArray(v) ? v : v ? String(v).split(",").map((x) => x.trim()) : []).filter(Boolean);
const write = (p, content) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); };
const jsonld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;

// ---------- load stories ----------
const storyDir = path.join(ROOT, "stories");
const files = fs.existsSync(storyDir) ? fs.readdirSync(storyDir).filter((f) => f.endsWith(".md") && !f.startsWith("_")) : [];
const slugs = new Set();
const errors = [];

const stories = files.map((file) => {
  const raw = fs.readFileSync(path.join(storyDir, file), "utf8");
  const { data: fm, content } = matter(raw);
  const slug = String(fm.slug || file.replace(/\.md$/, "")).trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push(`${file}: slug "${slug}" must be lowercase ascii words joined by hyphens`);
  if (slugs.has(slug)) errors.push(`${file}: duplicate slug "${slug}"`);
  slugs.add(slug);
  if (!fm.title) errors.push(`${file}: missing title`);
  const date = toDate(fm.date) || fs.statSync(path.join(storyDir, file)).mtime;
  if (isNaN(date)) errors.push(`${file}: invalid date`);

  // markdown -> html, chapters (##) get anchors for the TOC
  const chapters = [];
  const md = new Marked({
    gfm: true,
    breaks: false,
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        if (depth === 2) {
          const id = `ch-${chapters.length + 1}`;
          chapters.push({ id, title: stripMd(html) });
          return `<h2 id="${id}">${html}</h2>\n`;
        }
        return `<h${depth}>${html}</h${depth}>\n`;
      },
    },
  });
  const body = md.parse(content);
  const plain = stripMd(body);
  const words = plain.split(/\s+/).filter(Boolean).length;
  const description = String(fm.description || clip(plain, 155));

  return {
    file, slug, fm, body, chapters, words,
    title: String(fm.title || slug),
    subtitle: fm.subtitle ? String(fm.subtitle) : "",
    description,
    excerpt: String(fm.excerpt || fm.description || clip(plain, 220)),
    date,
    updated: toDate(fm.updated) || date,
    tags: asList(fm.tags),
    keywords: asList(fm.keywords),
    genre: fm.genre ? String(fm.genre) : "",
    series: fm.series ? String(fm.series) : "",
    ideaBy: String(fm.idea_by || cfg.owner.name),
    writtenBy: String(fm.written_by || `${cfg.writer.name} (${cfg.writer.org})`),
    model: fm.model ? String(fm.model) : "",
    draft: fm.draft === true,
    image: fm.image ? String(fm.image) : "",
    imageAlt: String(fm.image_alt || fm.title || ""),
    minutes: Math.max(1, Math.round(words / 180)),
    url: abs(`/${slug}/`),
    path: rel(`/${slug}/`),
  };
}).filter((s) => !s.draft).sort((a, b) => b.date - a.date);

if (errors.length) { console.error("Build failed:\n  " + errors.join("\n  ")); process.exit(1); }

for (const s of stories) {
  s.ogImage = s.image ? (/^https?:/.test(s.image) ? s.image : abs("/" + s.image.replace(/^\//, ""))) : abs(`/og/${s.slug}.png`);
}

// ---------- shared chunks ----------
const fontLinks = `<link rel="preconnect" href="https://fonts.maateen.me" crossorigin>
<link href="https://fonts.maateen.me/kalpurush/font.css" rel="stylesheet">`;

function head({ title, description, url, image, imageAlt, type = "website", keywords = [], extra = "" }) {
  const kw = [...new Set([...keywords, ...cfg.keywords])].join(", ");
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="keywords" content="${esc(kw)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="generator" content="sakhadib/stories">
<meta name="theme-color" content="#ffffff">
<link rel="canonical" href="${esc(url)}">
<link rel="alternate" hreflang="bn" href="${esc(url)}">
<link rel="alternate" hreflang="x-default" href="${esc(url)}">
<link rel="alternate" type="application/rss+xml" title="${esc(cfg.title)} — RSS" href="${abs("/feed.xml")}">
<link rel="icon" href="${rel("/favicon.svg")}" type="image/svg+xml">
<meta property="og:site_name" content="${esc(cfg.title)}">
<meta property="og:locale" content="${esc(cfg.locale)}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(imageAlt || title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(imageAlt || title)}">
${cfg.twitter ? `<meta name="twitter:site" content="${esc(cfg.twitter)}">\n<meta name="twitter:creator" content="${esc(cfg.twitter)}">` : ""}
${fontLinks}
<link rel="stylesheet" href="${rel("/assets/style.css")}?v=${BUILD_TIME.getTime()}">
${extra}`;
}

const header = () => `<a class="skip" href="#main">মূল লেখায় যান</a>
<header class="site-head"><div class="wide">
  <a class="brand" href="${rel("/")}">${esc(cfg.title)}<small>${esc(cfg.tagline)}</small></a>
  <nav><a href="${rel("/")}">সব গল্প</a><a href="${rel("/about/")}">পরিচিতি</a><a href="${rel("/feed.xml")}">RSS</a></nav>
</div></header>`;

const footer = () => `<footer class="site-foot"><div class="wide">
  <p>প্রতিটি গল্প লিখেছে <a href="${cfg.writer.url}" rel="noopener">${esc(cfg.writer.name)}</a> (${esc(cfg.writer.org)}-এর এআই), ভাবনা ও সম্পাদনা <a href="${cfg.owner.url}" rel="author noopener">${esc(cfg.owner.nameBn)}</a>-এর। এটা শুরু থেকেই খোলাখুলি জানানো।</p>
  <p>Stories written by Claude (Anthropic) from ideas by ${esc(cfg.owner.name)}. · <a href="${cfg.owner.github}/stories" rel="noopener">GitHub</a> · <a href="${rel("/feed.xml")}">RSS</a></p>
</div></footer>
<div class="toast" role="status" aria-live="polite"></div>
<script src="${rel("/assets/site.js")}?v=${BUILD_TIME.getTime()}" defer></script>`;

const metaLine = (s) => `<div class="meta"><span><time datetime="${isoDate(s.date)}">${bnDate(s.date)}</time></span><span>${bnDigits(s.minutes)} মিনিটের পাঠ</span>${s.genre ? `<span>${esc(s.genre)}</span>` : ""}</div>`;

const disclosure = (s) => `<aside class="disclosure" aria-label="লেখক পরিচিতি">
  <strong>খোলাখুলি:</strong> এই গল্পটি লিখেছে ${esc(cfg.writer.name)}, ${esc(cfg.writer.org)}-এর তৈরি একটি এআই। ভাবনা ও সম্পাদনা ${esc(cfg.owner.nameBn)}-এর।${s && s.model ? ` (মডেল: ${esc(s.model)})` : ""}
</aside>`;

const icons = {
  fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L1.8 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>',
  in: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4V21H3zM9.5 9.75h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2-.2-.2-.4-.3z"/></svg>',
  tg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.6 13.2 1.9 11.7c-1-.3-1-1 .2-1.5L20.6 3c.9-.3 1.6.2 1.3 1.3z"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l3-3a1 1 0 1 1 1.4 1.4l-3 3a1 1 0 0 1-1.4 0zm-2.1 4.2a3 3 0 0 1-4.2-4.2l2.8-2.8a1 1 0 1 0-1.4-1.4L2.9 12a5 5 0 0 0 7.1 7.1l2.8-2.8a1 1 0 0 0-1.4-1.4zM21.1 2.9a5 5 0 0 0-7.1 0l-2.8 2.8a1 1 0 0 0 1.4 1.4l2.8-2.8a3 3 0 0 1 4.2 4.2l-2.8 2.8a1 1 0 1 0 1.4 1.4l2.8-2.8a5 5 0 0 0 .1-7z"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1z"/></svg>',
};

function shareBlock(s) {
  const u = encodeURIComponent(s.url);
  const t = encodeURIComponent(s.title);
  const tu = encodeURIComponent(`${s.title} — ${s.url}`);
  return `<section class="share" aria-label="শেয়ার করুন">
  <p>গল্পটা ভালো লাগলে কাউকে পাঠিয়ে দিন</p>
  <div class="share-row">
    <button type="button" data-native-share data-title="${esc(s.title)}" data-text="${esc(s.description)}" data-url="${esc(s.url)}" hidden>${icons.share}শেয়ার</button>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener">${icons.fb}Facebook</a>
    <a href="https://wa.me/?text=${tu}" target="_blank" rel="noopener">${icons.wa}WhatsApp</a>
    <a href="https://x.com/intent/post?text=${t}&amp;url=${u}" target="_blank" rel="noopener">${icons.x}X</a>
    <a href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" target="_blank" rel="noopener">${icons.in}LinkedIn</a>
    <a href="https://t.me/share/url?url=${u}&amp;text=${t}" target="_blank" rel="noopener">${icons.tg}Telegram</a>
    <button type="button" data-copy="${esc(s.url)}">${icons.link}লিংক কপি</button>
  </div>
</section>`;
}

const publisher = { "@type": "Person", name: cfg.owner.name, url: cfg.owner.url };
const websiteLd = { "@context": "https://schema.org", "@type": "WebSite", name: cfg.title, alternateName: "Stories by Claude", url: abs("/"), inLanguage: cfg.language, description: cfg.description, publisher };

// ---------- story pages ----------
stories.forEach((s, i) => {
  const newer = stories[i - 1];
  const older = stories[i + 1];
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      additionalType: "https://schema.org/ShortStory",
      headline: clip(s.title, 110),
      alternativeHeadline: s.subtitle || undefined,
      description: s.description,
      url: s.url,
      mainEntityOfPage: { "@type": "WebPage", "@id": s.url },
      image: { "@type": "ImageObject", url: s.ogImage, width: 1200, height: 630 },
      datePublished: isoDate(s.date),
      dateModified: isoDate(s.updated),
      inLanguage: "bn",
      genre: s.genre || "Fiction",
      keywords: [...s.tags, ...s.keywords].join(", ") || undefined,
      wordCount: s.words,
      timeRequired: `PT${s.minutes}M`,
      isPartOf: s.series ? { "@type": "CreativeWorkSeries", name: s.series } : { "@type": "WebSite", name: cfg.title, url: abs("/") },
      author: { "@type": "Person", name: s.ideaBy, url: cfg.owner.url, description: "Idea and editing" },
      contributor: { "@type": "SoftwareApplication", name: cfg.writer.name, applicationCategory: "Large language model", creator: { "@type": "Organization", name: cfg.writer.org }, url: cfg.writer.url },
      creditText: `Written by ${s.writtenBy} from an idea by ${s.ideaBy}. AI-generated text, disclosed.`,
      publisher,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: cfg.title, item: abs("/") },
        { "@type": "ListItem", position: 2, name: s.title, item: s.url },
      ],
    },
  ];

  const articleMeta = `<meta property="article:published_time" content="${isoDate(s.date)}">
<meta property="article:modified_time" content="${isoDate(s.updated)}">
<meta property="article:author" content="${esc(cfg.owner.url)}">
${s.genre ? `<meta property="article:section" content="${esc(s.genre)}">` : ""}
${s.tags.map((t) => `<meta property="article:tag" content="${esc(t)}">`).join("\n")}
<meta name="author" content="${esc(s.writtenBy)}; ধারণা: ${esc(s.ideaBy)}">
<meta name="ai-generated" content="true">
${jsonld(ld)}`;

  const toc = s.chapters.length >= 3
    ? `<details class="toc"><summary>অধ্যায়সমূহ (${bnDigits(s.chapters.length)})</summary><ol>${s.chapters.map((c) => `<li><a href="#${c.id}">${esc(c.title)}</a></li>`).join("")}</ol></details>`
    : "";

  const html = `<!doctype html>
<html lang="bn" dir="ltr">
<head>
${head({ title: `${s.title} — ${cfg.title}`, description: s.description, url: s.url, image: s.ogImage, imageAlt: s.imageAlt, type: "article", keywords: [...s.tags, ...s.keywords], extra: articleMeta })}
</head>
<body>
<div class="progress" aria-hidden="true"></div>
${header()}
<main id="main">
<article class="wrap" itemscope itemtype="https://schema.org/Article">
  <header class="story-head">
    ${s.series ? `<p class="kicker">${esc(s.series)}</p>` : s.genre ? `<p class="kicker">${esc(s.genre)}</p>` : ""}
    <h1 itemprop="headline">${esc(s.title)}</h1>
    ${s.subtitle ? `<p class="dek">${esc(s.subtitle)}</p>` : `<p class="dek" itemprop="description">${esc(s.description)}</p>`}
    ${metaLine(s)}
    ${disclosure(s)}
  </header>
  <div class="tools" aria-label="লেখার আকার"><button type="button" data-fs="-1" aria-label="লেখা ছোট">অ−</button><button type="button" data-fs="1" aria-label="লেখা বড়">অ+</button></div>
  ${toc}
  <div class="prose" itemprop="articleBody">
${s.body}
    <p class="endmark">॥ সমাপ্ত ॥</p>
  </div>
  ${s.tags.length ? `<ul class="tags" aria-label="ট্যাগ">${s.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
  ${shareBlock(s)}
  <nav class="pager" aria-label="আরও গল্প">
    ${older ? `<a class="prev" href="${older.path}"><small>আগের গল্প</small>${esc(older.title)}</a>` : ""}
    ${newer ? `<a class="next" href="${newer.path}"><small>পরের গল্প</small>${esc(newer.title)}</a>` : ""}
  </nav>
</article>
</main>
${footer()}
</body>
</html>
`;
  write(path.join(OUT, s.slug, "index.html"), html);
});

// ---------- home ----------
const homeLd = [
  websiteLd,
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cfg.title,
    url: abs("/"),
    inLanguage: "bn",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: stories.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: s.url, name: s.title })),
    },
  },
];
const list = stories.length
  ? `<ul class="story-list">${stories.map((s) => `<li><a class="story-card" href="${s.path}">
    <h2>${esc(s.title)}</h2>
    <p>${esc(s.excerpt)}</p>
    ${metaLine(s)}
  </a></li>`).join("\n")}</ul>`
  : `<p class="empty">প্রথম গল্পটা আসছে শীঘ্রই।</p>`;

write(path.join(OUT, "index.html"), `<!doctype html>
<html lang="bn">
<head>
${head({ title: `${cfg.title} — ${cfg.tagline}`, description: cfg.description, url: abs("/"), image: abs("/og/home.png"), extra: jsonld(homeLd) })}
</head>
<body>
${header()}
<main id="main" class="wide">
  <section class="hero">
    <h1>${esc(cfg.title)}</h1>
    <p>${esc(cfg.description)}</p>
  </section>
  ${list}
</main>
${footer()}
</body>
</html>
`);

// ---------- about ----------
write(path.join(OUT, "about", "index.html"), `<!doctype html>
<html lang="bn">
<head>
${head({ title: `পরিচিতি — ${cfg.title}`, description: cfg.description, url: abs("/about/"), image: abs("/og/home.png"), extra: jsonld(websiteLd) })}
</head>
<body>
${header()}
<main id="main" class="wrap">
  <header class="story-head"><h1>পরিচিতি</h1></header>
  <div class="prose">
    <p>এটা একটা যৌথ গল্পের খাতা। গল্পের বীজ, মানে মূল ভাবনাটা দেন ${esc(cfg.owner.nameBn)}। সেই ভাবনা থেকে পুরো গল্পটা লেখে ${esc(cfg.writer.name)}, ${esc(cfg.writer.org)}-এর তৈরি একটি এআই।</p>
    <p>আমরা এটা লুকাই না। প্রতিটি গল্পের মাথায় তাই স্পষ্ট করে লেখা থাকে কে লিখেছে। পাঠক জেনেশুনে পড়বেন, এটাই আমাদের নিয়ম।</p>
    <p>This is a collection of long-form Bangla fiction. Every story is written by Claude, an AI model made by Anthropic, from an idea by ${esc(cfg.owner.name)}. The AI authorship is disclosed on every page.</p>
  </div>
</main>
${footer()}
</body>
</html>
`);

// ---------- 404 ----------
write(path.join(OUT, "404.html"), `<!doctype html>
<html lang="bn"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>পাতাটা পাওয়া যায়নি — ${esc(cfg.title)}</title><meta name="robots" content="noindex">
${fontLinks}
<link rel="stylesheet" href="${rel("/assets/style.css")}">
</head><body>
${header()}
<main id="main" class="wrap"><header class="story-head"><h1>পাতাটা হারিয়ে গেছে</h1><p class="dek">যে গল্পটা খুঁজছেন, সেটা এখানে নেই। <a href="${rel("/")}">সব গল্পে ফিরে যান</a>।</p></header></main>
${footer()}
</body></html>
`);

// ---------- feed, sitemap, robots ----------
const cdata = (s) => `<![CDATA[${String(s).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
write(path.join(OUT, "feed.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>${esc(cfg.title)}</title>
  <link>${abs("/")}</link>
  <atom:link href="${abs("/feed.xml")}" rel="self" type="application/rss+xml"/>
  <description>${esc(cfg.description)}</description>
  <language>bn</language>
  <lastBuildDate>${BUILD_TIME.toUTCString()}</lastBuildDate>
${stories.map((s) => `  <item>
    <title>${esc(s.title)}</title>
    <link>${s.url}</link>
    <guid isPermaLink="true">${s.url}</guid>
    <pubDate>${s.date.toUTCString()}</pubDate>
    <dc:creator>${esc(s.writtenBy)} (idea: ${esc(s.ideaBy)})</dc:creator>
    <description>${cdata(s.description)}</description>
    <content:encoded>${cdata(disclosure(s) + s.body)}</content:encoded>
${s.tags.map((t) => `    <category>${esc(t)}</category>`).join("\n")}
  </item>`).join("\n")}
</channel>
</rss>
`);

const lastmod = stories.length ? stories.reduce((m, s) => (s.updated > m ? s.updated : m), stories[0].updated) : BUILD_TIME;
write(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>${abs("/")}</loc><lastmod>${isoDate(lastmod)}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${abs("/about/")}</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
${stories.map((s) => `  <url><loc>${s.url}</loc><lastmod>${isoDate(s.updated)}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority><image:image><image:loc>${esc(s.ogImage)}</image:loc></image:image></url>`).join("\n")}
</urlset>
`);

write(path.join(OUT, "robots.txt"), `User-agent: *
Allow: /

Sitemap: ${abs("/sitemap.xml")}
`);

// ---------- static assets ----------
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "src", "style.css"), path.join(OUT, "assets", "style.css"));
fs.copyFileSync(path.join(ROOT, "src", "site.js"), path.join(OUT, "assets", "site.js"));
fs.copyFileSync(path.join(ROOT, "src", "favicon.svg"), path.join(OUT, "favicon.svg"));
write(path.join(OUT, ".nojekyll"), "");
if (fs.existsSync(path.join(ROOT, "images"))) fs.cpSync(path.join(ROOT, "images"), path.join(OUT, "images"), { recursive: true });

// manifest for the OG image generator
write(path.join(OUT, "og", "manifest.json"), JSON.stringify({
  site: { title: cfg.title, tagline: cfg.tagline, host: (ORIGIN + BASE).replace(/^https?:\/\//, "") },
  items: [
    { slug: "home", title: cfg.title, subtitle: cfg.tagline, home: true },
    ...stories.filter((s) => !s.image).map((s) => ({ slug: s.slug, title: s.title, subtitle: s.subtitle || s.description, genre: s.genre, minutes: bnDigits(s.minutes), date: bnDate(s.date) })),
  ],
}, null, 2));

console.log(`Built ${stories.length} stor${stories.length === 1 ? "y" : "ies"} -> ${path.relative(ROOT, OUT)}/`);
