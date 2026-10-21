// STUB (Slice 1): always uses the pre-written explanation. api-builder replaces with Groq.
import { fallbackExplanation } from "@/lib/explainFallback";
import type { ExplainRequest, ExplainResponse } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as ExplainRequest;
  const res: ExplainResponse = { status: "done", data: { text: fallbackExplanation(body), source: "fallback" } };
  return Response.json(res);
}
