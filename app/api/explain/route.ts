import { fallbackExplanation } from "@/lib/explainFallback";
import { guard } from "@/lib/server/guard";
import { done, failed, MESSAGES } from "@/lib/server/http";
import type { ExplainRequest, RiskLevel } from "@/lib/types";

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

    return done({ text: fallbackExplanation(input), source: "fallback" as const });
  } catch {
    return done({ text: "We couldn't write a summary this time. The details below still apply.", source: "fallback" as const });
  }
}
