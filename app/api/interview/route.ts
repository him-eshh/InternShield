import { guard } from "@/lib/server/guard";
import { failed } from "@/lib/server/http";
import { handleInterview, INTERVIEW_FAILED } from "@/lib/server/interview";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const g = await guard(req, "interview");
    if (!g.ok) return g.response;
    return await handleInterview(g.body);
  } catch {
    return failed("error", { message: INTERVIEW_FAILED });
  }
}
