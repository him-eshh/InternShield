// Rebuilds data/question-bank/bank.json from two pinned public MIT datasets (see SOURCES.md).
// Usage: node data/question-bank/build.mjs
// Keeps metadata only: title, slug URL, difficulty, tags, companies. Problem statements are read and thrown away.
import { gunzipSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const COMPANY_REPO = "hxu296/leetcode-company-wise-problems-2022";
const COMPANY_SHA = "33f44cb62594b13f7b3e0ec12e8f811b40fddd0d";
const META_REPO = "newfacade/LeetCodeDataset";
const META_SHA = "182cd19fd53161efd70a1ef074fe1056b659bfa3";
const META_FILES = ["LeetCodeDataset-v0.3.1-train.jsonl.gz", "LeetCodeDataset-v0.3.1-test.jsonl.gz"];
const TOP_COMPANIES = 60; // companies with the most listed problems
const MAX_COMPANIES_PER_QUESTION = 12;

const raw = (repo, sha, path) => `https://raw.githubusercontent.com/${repo}/${sha}/${path}`;
const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r;
};

// 1. Problem metadata (difficulty + topic tags) keyed by slug.
const meta = new Map();
for (const f of META_FILES) {
  const buf = Buffer.from(await (await get(raw(META_REPO, META_SHA, `data/${f}`))).arrayBuffer());
  for (const line of gunzipSync(buf).toString("utf8").split("\n")) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    const slug = (o.task_id ?? "").trim();
    if (!slug || !o.difficulty || meta.has(slug)) continue;
    meta.set(slug, { difficulty: o.difficulty, tags: (o.tags ?? []).map((t) => String(t).toLowerCase()), id: o.question_id });
  }
}

// 2. Company lists.
const tree = await (await get(`https://api.github.com/repos/${COMPANY_REPO}/git/trees/${COMPANY_SHA}?recursive=1`)).json();
const files = tree.tree.filter((t) => /^companies\/.+\.csv$/.test(t.path)).map((t) => t.path);
const byCompany = new Map();
const titles = new Map();
for (const p of files) {
  const company = p.replace(/^companies\//, "").replace(/\.csv$/, "");
  const text = await (await get(raw(COMPANY_REPO, COMPANY_SHA, encodeURI(p)))).text();
  const rows = [];
  for (const line of text.split(/\r?\n/).slice(1)) {
    const m = /^https:\/\/leetcode\.com\/problems\/([a-z0-9-]+)\/?,(.*),(\d+)$/.exec(line.trim());
    if (!m) continue;
    titles.set(m[1], m[2].replace(/^"|"$/g, "").trim());
    rows.push([m[1], Number(m[3])]);
  }
  byCompany.set(company, rows);
}
const ranked = [...byCompany].sort((a, b) => b[1].length - a[1].length).slice(0, TOP_COMPANIES);
const keep = new Set(ranked.map(([c]) => c));

// 3. Join. Questions without known difficulty are dropped.
const qs = new Map();
for (const [company, rows] of byCompany) {
  for (const [slug, freq] of rows) {
    const m = meta.get(slug);
    if (!m) continue;
    const q = qs.get(slug) ?? { id: `lc-${m.id ?? slug}`, title: titles.get(slug) ?? slug, difficulty: m.difficulty, url: `https://leetcode.com/problems/${slug}/`, tags: m.tags, companies: [], _f: [], source: "hxu296 + newfacade (MIT)" };
    if (keep.has(company)) q._f.push([company, freq]);
    qs.set(slug, q);
  }
}
const out = [...qs.values()]
  .map(({ _f, ...q }) => ({ ...q, companies: _f.sort((a, b) => b[1] - a[1]).slice(0, MAX_COMPANIES_PER_QUESTION).map(([c]) => c) }))
  .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
writeFileSync(new URL("./bank.json", import.meta.url), JSON.stringify(out));
console.log(`questions ${out.length}, with company ${out.filter((q) => q.companies.length).length}, companies ${keep.size}, bytes ${JSON.stringify(out).length}`);
