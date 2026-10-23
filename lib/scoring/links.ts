// Local link checks (brief C5; findings 01 rule 5, 02 sections 3.3/4.2). Pure: the link itself is
// never fetched. Weights live in score.ts; this only says what's wrong with each link.
import { parse } from "tldts";
import type { LinkCheck, LinkIssue } from "../types";
import { isHiringPlatform, lookalike, registrableDomain } from "./domains";

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'()]+|\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|ly|gl|gle|info|xyz|top|site|online|biz|me|us|app|jobs|work|careers)\/[^\s<>"'()]*/gi;

const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at",
  "rb.gy", "t.ly", "tiny.cc", "s.id", "lnkd.in",
]);

const HIRING_WORDS = /(?:careers?|hr|hiring|apply|jobs?|recruit(?:ing|ment)?|onboard(?:ing)?|talent)/;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/** URLs in the message, trailing punctuation trimmed, first occurrence only. */
export function findUrls(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.match(URL_RE) ?? []) seen.add(m.replace(/[.,;:!?]+$/, ""));
  return [...seen];
}

function hostOf(url: string): string {
  return url.toLowerCase().replace(/^[a-z]+:\/\//, "").split(/[/?#:]/)[0];
}

/** Distinctive lowercase word of the company name ("Northwind Labs Inc." -> "northwind"). */
function brandWord(company: string | null): string | null {
  const w = (company ?? "").toLowerCase().match(/[a-z0-9]{4,}/g)?.find((x) => !/^(?:inc|corp|labs?|group|global|the|llc|ltd|company|technologies|solutions)$/.test(x));
  return w ?? null;
}

export function checkLinks(text: string, ctx: { company: string | null; officialDomain: string | null }): LinkCheck[] {
  const official = registrableDomain(ctx.officialDomain);
  const brand = brandWord(ctx.company);
  return findUrls(text).map((url) => {
    const host = hostOf(url);
    const domain = registrableDomain(host) ?? host;
    const path = url.toLowerCase().slice(url.toLowerCase().indexOf(host) + host.length);
    const issues: LinkIssue[] = [];
    if (IPV4.test(host)) issues.push("raw-ip");
    if (host.split(".").some((p) => p.startsWith("xn--"))) issues.push("punycode");
    if (SHORTENERS.has(host) || SHORTENERS.has(domain)) issues.push("shortener");
    if (host === "forms.gle" || (domain === "google.com" && /^\/(?:forms|document|spreadsheets)\//.test(path))) issues.push("google-form");
    const onOfficial = !!official && domain === official;
    if (official && !onOfficial && lookalike(domain, official)) issues.push("lookalike");
    const label = parse(host).domainWithoutSuffix ?? "";
    // ponytail: brand match is one distinctive word; misses brands written as two joined words
    // Registrable label only: "careers.northwind.com" is the company's own subdomain, "northwind-careers.com" isn't.
    if (brand && !onOfficial && !isHiringPlatform(domain) && label.includes(brand) && HIRING_WORDS.test(label.replace(brand, ""))) {
      issues.push("brand-careers-offsite");
    }
    return { url, host, issues };
  });
}
