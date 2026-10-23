import { guard } from "@/lib/server/guard";
import { handleTranscribe, transcribeFailed } from "@/lib/server/transcribe";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const g = await guard(req, "transcribe");
    if (!g.ok) return g.response;
    return await handleTranscribe(g.body);
  } catch {
    // Never include the request body (it holds the image) in anything we log or return.
    return transcribeFailed();
  }
}
