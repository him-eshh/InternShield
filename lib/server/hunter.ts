// Hunter Email Insight (free endpoint, no credits). Only runs when HUNTER_API_KEY is set.
import type { SenderData } from "@/lib/types";
import { normalizeFetchInit } from "./http";

export function hunterEnabled(): boolean {
  return Boolean(process.env.HUNTER_API_KEY);
}

/** null = no key, or the call failed (the check simply doesn't exist). */
export async function getHunterInsight(email: string): Promise<SenderData["hunter"]> {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.hunter.io/v2/email-insight?email=${encodeURIComponent(email)}`,
      normalizeFetchInit({ headers: { "X-API-KEY": key } }),
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { pattern?: unknown; webmail?: unknown; disposable?: unknown } };
    const d = json.data;
    if (!d) return null;
    return {
      pattern: typeof d.pattern === "string" ? d.pattern : d.pattern === true ? "known" : null,
      webmail: d.webmail === true,
      disposable: d.disposable === true,
    };
  } catch {
    return null;
  }
}
