// STUB (Slice 1): returns saved example facts. api-builder replaces with Groq + Quote Check.
import { EXAMPLES } from "@/lib/examples";
import type { ExtractRequest, ExtractResponse } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as ExtractRequest;
  const ex = body.message?.includes("Stripe") ? EXAMPLES.real : EXAMPLES.scam;
  return Response.json(ex.savedSteps.extract as ExtractResponse);
}
