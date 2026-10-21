// MX lookup over DNS-over-HTTPS: Google first, Cloudflare as fallback (spec.md > Sender Route).
import { cacheGet, cacheSet, DAY } from "./cache";

const TTL = 7 * DAY;
const PER_RESOLVER_MS = 4000; // two resolvers stay under the 10s client timeout

interface DohResponse {
  Status?: number;
  Answer?: { type?: number; data?: string }[];
}

async function ask(url: string, headers?: Record<string, string>): Promise<boolean | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(PER_RESOLVER_MS) });
    if (!res.ok) return null;
    const json = (await res.json()) as DohResponse;
    if (json.Status === 0) return (json.Answer ?? []).some((a) => a.type === 15);
    if (json.Status === 3) return false; // NXDOMAIN
    return null;
  } catch {
    return null;
  }
}

/** true/false = answered; null = couldn't check. */
export async function hasMx(domain: string): Promise<boolean | null> {
  const key = `mx:${domain}`;
  const hit = cacheGet<{ v: boolean }>(key);
  if (hit) return hit.v;
  const name = encodeURIComponent(domain);
  const result =
    (await ask(`https://dns.google/resolve?name=${name}&type=MX`)) ??
    (await ask(`https://cloudflare-dns.com/dns-query?name=${name}&type=MX`, { accept: "application/dns-json" }));
  if (result !== null) cacheSet(key, { v: result }, TTL);
  return result;
}
