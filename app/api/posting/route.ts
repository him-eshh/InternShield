// STUB (Slice 1): returns saved example result. api-builder replaces with Tavily.
import { EXAMPLES } from "@/lib/examples";
import type { PostingRequest, PostingResponse } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as PostingRequest;
  const saved = EXAMPLES.real.savedSteps.posting;
  const res: PostingResponse =
    body.officialDomain === "stripe.com" && saved.status === "done"
      ? saved
      : { status: "done", data: { found: false, url: null, title: null, location: null, pay: null, postedDate: null, onOfficialDomain: false } };
  return Response.json(res);
}
