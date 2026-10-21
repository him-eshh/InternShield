import { guard } from "@/lib/server/guard";
import { failed } from "@/lib/server/http";
import { handleRewrite, REWRITE_FAILED } from "@/lib/server/rewrite";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const g = await guard(req, "rewrite");
    if (!g.ok) return g.response;
    return await handleRewrite(g.body);
  } catch {
    return failed("error", { message: REWRITE_FAILED });
  }
}
