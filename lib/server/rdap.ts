// Domain registration date via RDAP (spec.md > Sender Route). Cached 7 days by domain.
import { cacheGet, cacheSet, DAY } from "./cache";
import { normalizeFetchInit } from "./http";

const TTL = 7 * DAY;

/** ISO registration date, or null when it can't be checked (404, rate limit, network). */
export async function getRegistrationDate(domain: string): Promise<string | null> {
  const key = `rdap:${domain}`;
  const hit = cacheGet<{ v: string | null }>(key);
  if (hit) return hit.v;
  try {
    const res = await fetch(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      // rdap.org answers 403 to clients without a User-Agent (found in live testing).
      normalizeFetchInit({ headers: { accept: "application/rdap+json, application/json", "user-agent": "InternShield/0.1" } }),
    );
    if (res.status === 404) {
      cacheSet(key, { v: null }, TTL); // that ending has no RDAP: don't ask again
      return null;
    }
    if (!res.ok) return null;
    const json = (await res.json()) as { events?: { eventAction?: string; eventDate?: string }[] };
    const date = json.events?.find((e) => e.eventAction === "registration")?.eventDate ?? null;
    if (date) cacheSet(key, { v: date }, TTL);
    return date;
  } catch {
    return null;
  }
}
