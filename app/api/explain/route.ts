import { hasBannedWord, fallbackExplanation } from "@/lib/explainFallback";
import { cacheGet, cacheSet, DAY } from "@/lib/server/cache";
import { fingerprint } from "@/lib/server/extract";
import { callGroq } from "@/lib/server/groq";
import { guard, takeExplain } from "@/lib/server/guard";
import { done, failed, MESSAGES } from "@/lib/server/http";
import type { ExplainRequest, RiskLevel } from "@/lib/types";

const SYSTEM =
  "Explain these risk signals from a recruiter message to a student in about 100 words, calm plain English. Add no new facts. Never say a message is safe, legit, legitimate or guaranteed. No markdown.";

const LEVELS: RiskLevel[] = ["low", "medium", "high"];
const cut = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

function parse(body: Record<string, unknown>): ExplainRequest | null {
  if (!LEVELS.includes(body.level as RiskLevel) || !Array.isArray(body.flags)) return null;
  const flags = body.flags.slice(0, 6).flatMap((f) => {
    const r = f as Record<string, unknown> | null;
    const title = cut(r?.title, 120);
    if (!title) return [];
    return [{ title, quote: cut(r?.quote, 200) || null, why: cut(r?.why, 200) }];
  });
  return { level: body.level as RiskLevel, flags };
}

export async function POST(req: Request) {
  try {
    const g = await guard(req, "explain");
    if (!g.ok) return g.response;
    const input = parse(g.body);
    if (!input) return failed("error", { status: 400, message: MESSAGES.bad });

    const fallback = () => done({ text: fallbackExplanation(input), source: "fallback" as const });
    if (input.flags.length === 0) return fallback();

    const key = `explain:${fingerprint(input.level, JSON.stringify(input.flags))}`;
    const cached = cacheGet<string>(key);
    if (cached) return done({ text: cached, source: "ai" as const });

    if (!takeExplain()) return fallback();

    const user =
      `Level: ${input.level}\n` + input.flags.map((f) => `${f.title} | ${f.quote ?? "-"}`).join("\n");
    const r = await callGroq("explain", { system: SYSTEM, user, maxTokens: 300 });
    if (!r.ok) return fallback();
    const text = r.data.trim();
    if (!text || hasBannedWord(text)) return fallback();
    cacheSet(key, text, DAY);
    return done({ text, source: "ai" as const });
  } catch {
    return done({ text: "We couldn't write a summary this time. The details below still apply.", source: "fallback" as const });
  }
}
