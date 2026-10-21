// Domain helpers: registrable domains, free email, hiring platforms, universities, lookalikes.
import { parse } from "tldts";
import { FREE_EMAIL_DOMAINS, HIRING_PLATFORM_DOMAINS } from "../constants";

/** "Jobs.Acme.co.uk/path" -> "acme.co.uk". null when it isn't a real domain. */
export function registrableDomain(hostOrUrl: string | null | undefined): string | null {
  if (!hostOrUrl) return null;
  const host = hostOrUrl.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").split(/[/?#:]/)[0];
  return parse(host).domain ?? null;
}

/** "jane@mail.acme.com" -> "acme.com". */
export function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  return at < 0 ? null : registrableDomain(email.slice(at + 1));
}

export const isFreeEmail = (domain: string) => FREE_EMAIL_DOMAINS.has(domain);
export const isHiringPlatform = (domain: string) => HIRING_PLATFORM_DOMAINS.has(domain);

export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

export type LookalikeKind = "close_spelling" | "extra_words" | "different_ending";

/**
 * Is `sender` a lookalike of `official`? Both are registrable domains.
 * Unrelated domains (staffing agencies, other companies) return null: never flagged alone.
 * Universities get no special pass: anything but the exact domain that looks close is flagged.
 */
export function lookalike(sender: string, official: string): LookalikeKind | null {
  if (sender === official) return null;
  const s = parse(sender).domainWithoutSuffix;
  const o = parse(official).domainWithoutSuffix;
  if (!s || !o) return null;
  if (s === o) return "different_ending";
  const sn = s.replace(/[-_.]/g, "");
  const on = o.replace(/[-_.]/g, "");
  if (sn === on) return "close_spelling";
  if (on.length >= 4 && sn.includes(on)) return "extra_words";
  if (on.length >= 5 && editDistance(sn, on) <= 2) return "close_spelling";
  return null;
}
