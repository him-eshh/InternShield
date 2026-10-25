import { cacheGet, cacheSet, DAY } from "@/lib/server/cache";
import { EXTRACT_SYSTEM, fingerprint, formLine, prepareMessage, quoteCheck } from "@/lib/server/extract";
import { EXTRACT_SCHEMA } from "@/lib/server/extractSchema";
import { callGroq } from "@/lib/server/groq";
import { guard, takeCheck } from "@/lib/server/guard";
import { classify, done, failed, fromOutcome, MESSAGES } from "@/lib/server/http";
import type { Facts } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const g = await guard(req, "extract");
    if (!g.ok) return g.response;
    const { message, sender, company } = g.body;
    if (typeof message !== "string" || !message.trim()) {
      return failed("error", { status: 400, message: MESSAGES.bad });
    }

    const text = prepareMessage(message);
    const prompt = formLine(sender, company) + text;
    const key = `extract:${fingerprint(prompt)}`;
    const cached = cacheGet<Facts>(key);
    if (cached) return done(cached);

    // Every uncached model call costs a slot, including a made-up example with
    // edited sender/company fields. Cached repeats are still free.
    const cap = takeCheck();
    if (!cap.ok) return failed("limit", { status: 429, retryAfter: cap.retryAfter, message: MESSAGES.daily });

    const r = await callGroq("extract", {
      system: EXTRACT_SYSTEM,
      user: prompt,
      schema: EXTRACT_SCHEMA,
      maxTokens: 1500,
    });
    if (!r.ok) return fromOutcome(r);

    let parsed: unknown;
    try {
      parsed = JSON.parse(r.data);
    } catch {
      return failed("error");
    }
    const facts = quoteCheck(parsed, text);
    if (!facts) return failed("error");
    cacheSet(key, facts, DAY);
    return done(facts);
  } catch (err) {
    return failed(classify(err));
  }
}
