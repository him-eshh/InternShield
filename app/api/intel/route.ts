import { companyIntel } from "@/lib/server/companyIntel";
import { guard } from "@/lib/server/guard";
import { done, failed, MESSAGES } from "@/lib/server/http";
import { MAX_CONTEXT_FIELD } from "@/lib/tiers/types";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const g = await guard(req, "intel");
    if (!g.ok) return g.response;
    const { company, role, kind } = g.body;
    const okText = (s: unknown) => typeof s === "string" && s.trim().length > 0 && s.length <= MAX_CONTEXT_FIELD;
    if (!okText(company) || (role != null && role !== "" && !okText(role)) || (kind !== "interview" && kind !== "resume")) {
      return failed("error", { status: 400, message: MESSAGES.bad });
    }
    return done(await companyIntel({ company: company as string, role: (role as string | null) ?? null, kind }));
  } catch {
    return failed("error");
  }
}
