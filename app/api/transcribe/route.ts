import { guard } from "@/lib/server/guard";
import { failed } from "@/lib/server/http";
import { handleTranscribe, TRANSCRIBE_FAILED } from "@/lib/server/transcribe";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const g = await guard(req, "transcribe");
    if (!g.ok) return g.response;
    return await handleTranscribe(g.body);
  } catch {
    // Never include the request body (it holds the image) in anything we log or return.
    return failed("error", { message: TRANSCRIBE_FAILED });
  }
}
