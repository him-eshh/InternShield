import { hasBannedWord, fallbackExplanation, tidyExplanation } from "@/lib/explainFallback";
import { cacheGet, cacheSet, DAY } from "@/lib/server/cache";
import { fingerprint } from "@/lib/server/extract";
import { callGroq } from "@/lib/server/groq";
import { guard, takeExplain } from "@/lib/server/guard";
import { done, failed, MESSAGES } from "@/lib/server/http";
import type { ExplainRequest, RiskLevel } from "@/lib/types";

const SYSTEM =
  "Explain these risk signals from a recruiter message to a student in at most 2 short paragraphs and about 80 words, calm plain English. Repeat each given quote word for word inside double quotes, and use each quote at most once. Add no new facts. Never use the words safe, safety, safely, legit, legitimate or guaranteed. No markdown.";

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
    // gpt-oss keeps writing "a legitimate company would…"; swap to "real" rather than lose the whole paragraph.
    // "safe"/"guaranteed" still reject outright.
    const text = tidyExplanation(r.data.trim().replace(/\blegitimate\b/gi, "real").replace(/\blegit\b/gi, "real"));
    if (!text || hasBannedWord(text)) return fallback();
    cacheSet(key, text, DAY);
    return done({ text, source: "ai" as const });
  } catch {
    return done({ text: "We couldn't write a summary this time. The details below still apply.", source: "fallback" as const });
  }
}
