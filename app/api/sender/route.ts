// STUB (Slice 1): returns saved example result. api-builder replaces with RDAP + MX (+ Hunter).
import { EXAMPLES } from "@/lib/examples";
import type { SenderRequest, SenderResponse } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as SenderRequest;
  const ex = body.email?.endsWith("@stripe.com") ? EXAMPLES.real : EXAMPLES.scam;
  return Response.json(ex.savedSteps.sender as SenderResponse);
}
