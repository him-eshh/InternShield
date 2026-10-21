// Tavily searches for the company and posting steps (spec.md > Company Route, Posting Route).
import { tavily } from "@tavily/core";
import { getDomain, getHostname } from "tldts";
import { HIRING_PLATFORM_DOMAINS, JOB_BOARD_DOMAINS, POSTING_SEARCH_DOMAINS } from "@/lib/constants";
import type { CompanyData, PostingData } from "@/lib/types";
import { cacheGet, cacheSet, DAY } from "./cache";
import { takeTavily } from "./guard";
import { classify, type Outcome, withTimeout } from "./http";

interface Hit {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
}

/** One basic search. Counts against TAVILY_DAILY_CAP. Never raw content. */
async function search(
  query: string,
  extra: { includeDomains?: string[]; includeDomainsMode?: "prefer" | "restrict" } = {},
): Promise<Outcome<Hit[]>> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { ok: false, reason: "error" };
  const cap = takeTavily();
  if (!cap.ok) return { ok: false, reason: "limit", retryAfter: cap.retryAfter };
  try {
    const client = tavily({ apiKey });
    const res = await withTimeout(
      client.search(query, { searchDepth: "basic", maxResults: 5, includeRawContent: false, ...extra }),
    );
    return { ok: true, data: (res?.results ?? []) as Hit[] };
  } catch (err) {
    const e = err as {
      response?: { status?: number; headers?: Record<string, unknown> };
      status?: number;
      message?: string;
    };
    const status = e?.response?.status ?? e?.status;
    if (status === 432 || status === 433 || /\b(432|433)\b|usage limit|plan limit/i.test(e?.message ?? "")) {
      return { ok: false, reason: "limit", retryAfter: 21600 }; // out of credits: "resting for today"
    }
    if (status === 429) {
      const ra = Number(e?.response?.headers?.["retry-after"]);
      return { ok: false, reason: "limit", retryAfter: Number.isFinite(ra) && ra > 0 ? Math.ceil(ra) : 30 };
    }
    return { ok: false, reason: classify(err) };
  }
}

export function registrable(url: string): string | null {
  return getDomain(url) ?? getHostname(url) ?? null;
}

const SUFFIX_WORDS = new Set(["inc", "llc", "ltd", "corp", "corporation", "co", "company", "plc", "gmbh", "the"]);

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !SUFFIX_WORDS.has(t));
}

/** 0..1 how well a domain's name matches the company name. */
export function nameSimilarity(company: string, domain: string): number {
  const tokens = nameTokens(company);
  const compact = tokens.join("");
  const label = domain.split(".")[0].replace(/[^a-z0-9]/g, "");
  if (!compact || !label) return 0;
  if (label === compact) return 1;
  if (label.length >= 4 && compact.includes(label) && label.length / compact.length >= 0.5) return 0.8;
  if (compact.length >= 4 && label.includes(compact)) return 0.8;
  // A single word must carry at least half the name: "Brightline Data Solutions" must not match gobrightline.com.
  if (tokens.some((t) => t.length >= 3 && label.includes(t) && t.length / compact.length >= 0.5)) return 0.6;
  return 0;
}

const CAREERS_RE = /career|jobs|join|work-with-us|hiring|opportunit/i;

export function pickOfficial(company: string, hits: Hit[]): CompanyData | null {
  let best: { domain: string; score: number } | null = null;
  for (const h of hits) {
    const domain = registrable(h.url);
    if (!domain || JOB_BOARD_DOMAINS.has(domain) || HIRING_PLATFORM_DOMAINS.has(domain)) continue;
    const score = nameSimilarity(company, domain);
    if (score >= 0.6 && (!best || score > best.score)) best = { domain, score };
  }
  if (!best) return null;
  const officialDomain = best.domain;
  // Shortest matching URL is usually the careers home, not a sub-page.
  const careers = hits
    .filter((h) => registrable(h.url) === officialDomain && CAREERS_RE.test(h.url))
    .sort((a, b) => a.url.length - b.url.length)[0];
  return { officialDomain, careersUrl: careers?.url ?? null };
}

export async function findCompany(company: string): Promise<Outcome<CompanyData | null>> {
  const key = `company:${company.toLowerCase()}`;
  const hit = cacheGet<CompanyData | null>(key);
  if (hit !== undefined) return { ok: true, data: hit };
  const r = await search(`${company} careers`);
  if (!r.ok) return r;
  const data = pickOfficial(company, r.data);
  cacheSet(key, data, DAY);
  return { ok: true, data };
}

// ---------- posting ----------

const PAY_RE =
  /\$\s?\d[\d,]*(?:\.\d+)?\s?[kK]?(?:\s?(?:-|–|to)\s?\$?\s?\d[\d,]*(?:\.\d+)?\s?[kK]?)?(?:\s?(?:\/|per\s)\s?(?:hr|hour|year|yr|month|week))?/;
const LOCATION_LABEL_RE = /\blocations?\s*[:\-]\s*([^\n.|]{2,60})/i;
// "City, ST" only: "Software Engineer, Intern" in a title must not read as a place.
const CITY_RE = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s?[A-Z]{2})\b/;
const REMOTE_RE = /\b(remote|hybrid|on-?site)\b/i;

export function readDetails(title: string, content: string): { location: string | null; pay: string | null } {
  const text = `${title}\n${content}`;
  const pay = PAY_RE.exec(text)?.[0].trim() ?? null;
  const location =
    LOCATION_LABEL_RE.exec(text)?.[1].trim() ??
    CITY_RE.exec(text)?.[1] ??
    REMOTE_RE.exec(text)?.[1].replace(/^./, (c) => c.toUpperCase()) ??
    null;
  return { location, pay };
}

function isHiringPlatform(url: string): boolean {
  const host = getHostname(url) ?? "";
  const dom = getDomain(url) ?? "";
  return HIRING_PLATFORM_DOMAINS.has(dom) || POSTING_SEARCH_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

function words(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
}

export function pickPosting(
  company: string,
  role: string | null,
  officialDomain: string,
  hits: Hit[],
): PostingData {
  const roleWords = words(role ?? "");
  let best: { hit: Hit; score: number; official: boolean } | null = null;
  for (const h of hits) {
    const official = registrable(h.url) === officialDomain;
    if (!official && !isHiringPlatform(h.url)) continue;
    const hay = new Set(words(`${h.title} ${h.url}`));
    const overlap = roleWords.filter((w) => hay.has(w)).length;
    // A posting must look like this role (or, with no role, like a jobs page), not any page on the site.
    if (roleWords.length ? overlap === 0 : !CAREERS_RE.test(h.url)) continue;
    const companyHit = nameTokens(company).some((t) => `${h.title} ${h.url}`.toLowerCase().includes(t)) ? 1 : 0;
    // A hiring-platform posting must name this company (dowjones.myworkdayjobs.com isn't Stripe's).
    if (!official && !companyHit) continue;
    const score = overlap * 2 + companyHit + (official ? 1 : 0);
    if (!best || score > best.score) best = { hit: h, score, official };
  }
  if (!best) {
    return { found: false, url: null, title: null, location: null, pay: null, postedDate: null, onOfficialDomain: false };
  }
  const { location, pay } = readDetails(best.hit.title ?? "", best.hit.content ?? "");
  return {
    found: true,
    url: best.hit.url,
    title: best.hit.title?.trim() || null,
    location,
    pay,
    postedDate: best.hit.publishedDate || null,
    onOfficialDomain: best.official,
  };
}

export async function findPosting(
  company: string,
  role: string | null,
  officialDomain: string,
): Promise<Outcome<PostingData>> {
  const key = `posting:${company.toLowerCase()}|${(role ?? "").toLowerCase()}|${officialDomain}`;
  const hit = cacheGet<PostingData>(key);
  if (hit) return { ok: true, data: hit };
  const r = await search(`${company} ${role ?? ""}`.trim(), {
    includeDomains: [officialDomain, ...POSTING_SEARCH_DOMAINS],
    includeDomainsMode: "prefer",
  });
  if (!r.ok) return r;
  const data = pickPosting(company, role, officialDomain, r.data);
  cacheSet(key, data, DAY);
  return { ok: true, data };
}
