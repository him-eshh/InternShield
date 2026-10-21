// STUB (Slice 1): returns saved example result. api-builder replaces with Tavily.
import { EXAMPLES } from "@/lib/examples";
import type { CompanyRequest, CompanyResponse } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as CompanyRequest;
  const ex = body.company === "Stripe" ? EXAMPLES.real : EXAMPLES.scam;
  return Response.json(ex.savedSteps.company as CompanyResponse);
}
