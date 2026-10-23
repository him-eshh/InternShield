// Browser-side calls to the Tier 2 routes. Network errors become a failed body, never a throw.
import type { InterviewRequest, InterviewResponse, RewriteRequest, RewriteResponse, TranscribeResponse } from "./types";

async function post<T extends { status: string }>(url: string, body: unknown): Promise<T> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as T;
    if (json && typeof json === "object" && (json.status === "done" || json.status === "failed")) return json;
    return { status: "failed", reason: "error" } as unknown as T;
  } catch {
    return { status: "failed", reason: "error" } as unknown as T;
  }
}

export const postRewrite = (req: RewriteRequest): Promise<RewriteResponse> => post<RewriteResponse>("/api/rewrite", req);

export const askInterview = (req: InterviewRequest): Promise<InterviewResponse> =>
  post<InterviewResponse>("/api/interview", req);

export const postTranscribe = (images: string[]): Promise<TranscribeResponse> =>
  post<TranscribeResponse>("/api/transcribe", images.length === 1 ? { image: images[0] } : { images });
