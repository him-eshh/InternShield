// Official website from Wikidata (findings 02 §3.3, §4.2): name -> company-type item -> P856.
// Free, no key. Never throws: any failure or doubt returns null and the caller falls back to Tavily.
import type { CompanyData } from "@/lib/types";
import { cacheGet, cacheSet, DAY } from "./cache";
import { takeWikidata } from "./guard";
import { registrableDomain } from "@/lib/scoring/domains";

const API = "https://www.wikidata.org/w/api.php";
const TIMEOUT_MS = 3000;
// Wikimedia User-Agent policy: identify the tool and a way to learn more about it.
const USER_AGENT = "InternShield/2.0 (student job-scam checker; contact via the project's GitHub repo)";
// Only items that describe a company or employer, so "Stripe" the pattern doesn't win over Stripe the company.
const ORG_DESC = /\b(?:company|corporation|business|enterprise|firm|conglomerate|manufacturer|retailer|bank|startup|organi[sz]ation|employer|university|college|agency|provider|developer|publisher|platform|chain|operator|insurer|airline|brand|subsidiary)\b/i;

const norm = (s: string) =>
  s.toLowerCase().replace(/\b(?:inc|llc|ltd|corp|corporation|co|company|plc|gmbh|the)\b\.?/g, "").replace(/[^a-z0-9]/g, "");

async function get(params: Record<string, string>): Promise<Record<string, unknown> | null> {
  if (!takeWikidata().ok) throw new Error("wikidata cap"); // not cached: Tavily gets a turn
  const url = `${API}?${new URLSearchParams({ format: "json", ...params })}`;
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`wikidata ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

interface Entity {
  labels?: Record<string, { value?: string }>;
  aliases?: Record<string, { value?: string }[]>;
  descriptions?: Record<string, { value?: string }>;
  claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } }; rank?: string }[]>;
}

/** Official domain for an exact-name company match, or null (not found, unsure, capped, or failed). */
export async function wikidataCompany(company: string): Promise<CompanyData | null> {
  const want = norm(company);
  if (want.length < 2) return null;
  const key = `wikidata:${want}`;
  const cached = cacheGet<CompanyData | null>(key);
  if (cached !== undefined) return cached;
  try {
    const found = await get({ action: "wbsearchentities", search: company, language: "en", type: "item", limit: "5" });
    const ids = ((found?.search as { id?: string }[] | undefined) ?? []).map((s) => s.id).filter((id): id is string => !!id);
    if (!ids.length) return remember(key, null);
    const got = await get({ action: "wbgetentities", ids: ids.join("|"), props: "labels|aliases|descriptions|claims", languages: "en" });
    const entities = (got?.entities ?? {}) as Record<string, Entity>;
    for (const id of ids) {
      const e = entities[id];
      if (!e) continue;
      const names = [e.labels?.en?.value, ...(e.aliases?.en ?? []).map((a) => a.value)].filter((n): n is string => !!n);
      if (!names.some((n) => norm(n) === want) || !ORG_DESC.test(e.descriptions?.en?.value ?? "")) continue;
      const sites = (e.claims?.P856 ?? []).filter((c) => c.rank !== "deprecated");
      const preferred = sites.find((c) => c.rank === "preferred") ?? sites[0];
      const url = preferred?.mainsnak?.datavalue?.value;
      const domain = typeof url === "string" ? registrableDomain(url) : null;
      if (domain) return remember(key, { officialDomain: domain, careersUrl: null });
    }
    return remember(key, null);
  } catch {
    return null; // timeout or network: don't cache, let Tavily try
  }
}

function remember(key: string, v: CompanyData | null): CompanyData | null {
  cacheSet(key, v, DAY);
  return v;
}
