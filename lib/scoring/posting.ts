// Comparing the message with the real posting (prd.md > Real-Posting Lookup).
import type { MatchRow, PostingData } from "../types";

const ROLE_STOPWORDS = new Set([
  "intern", "interns", "internship", "summer", "fall", "spring", "winter", "the", "of", "and", "a", "an", "for",
  "to", "in", "at", "part", "time", "full", "remote", "hybrid", "onsite", "position", "role", "program", "co", "op",
]);

function roleTokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1 && !ROLE_STOPWORDS.has(t) && !/^\d+$/.test(t))
      .map((t) => t.slice(0, 5)), // crude stem: "engineer"/"engineering" -> "engin"
  );
}

/** true/false when both sides are known, null otherwise. */
export function rolesMatch(messageRole: string | null, postingTitle: string | null): boolean | null {
  if (!messageRole || !postingTitle) return null;
  const a = roleTokens(messageRole);
  const b = roleTokens(postingTitle);
  if (a.size === 0 || b.size === 0) return true;
  for (const t of a) if (b.has(t)) return true;
  return false;
}

/** Close enough to count as the same role for the good sign: at least half the words of the shorter title are shared.
 *  One shared word ("study assistants" vs "Federal Work Study") is not a match, though it isn't a mismatch either. */
export function rolesClose(messageRole: string | null, postingTitle: string | null): boolean {
  if (!messageRole || !postingTitle) return true;
  const a = roleTokens(messageRole);
  const b = roleTokens(postingTitle);
  if (a.size === 0 || b.size === 0) return true;
  const shared = [...a].filter((t) => b.has(t)).length;
  return shared / Math.min(a.size, b.size) >= 0.5;
}

/** Hourly equivalent of the first amount in a pay string. */
function hourly(pay: string): number | null {
  const m = /\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?/i.exec(pay);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, "")) * (m[2] ? 1000 : 1);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (/month|\/mo\b/i.test(pay)) return n / 173;
  if (/week|\/wk\b/i.test(pay)) return n / 40;
  if (/\bday\b|daily/i.test(pay)) return n / 8;
  if (/year|annual|\/yr\b|salary/i.test(pay) || n >= 1000) return n / 2080;
  return n;
}

export function payMatch(messagePay: string | null, postingPay: string | null): boolean | null {
  if (!messagePay || !postingPay) return null;
  const a = hourly(messagePay);
  const b = hourly(postingPay);
  if (a === null || b === null) return null;
  return Math.max(a, b) / Math.min(a, b) <= 1.25;
}

export function matchRows(args: {
  posting: PostingData;
  company: string | null;
  officialDomain: string | null;
  role: string | null;
  pay: string | null;
  senderDomain: string | null;
  contactOk: boolean | null;
}): MatchRow[] {
  const { posting } = args;
  return [
    { row: "company", message: args.company, posting: args.officialDomain, ok: args.company && args.officialDomain && posting.onOfficialDomain ? true : null },
    { row: "role", message: args.role, posting: posting.title, ok: rolesMatch(args.role, posting.title) },
    { row: "pay", message: args.pay, posting: posting.pay, ok: payMatch(args.pay, posting.pay) },
    { row: "contact", message: args.senderDomain, posting: args.officialDomain, ok: args.contactOk },
  ];
}
