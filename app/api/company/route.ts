import { guard } from "@/lib/server/guard";
import { classify, failed, fromOutcome, MESSAGES } from "@/lib/server/http";
import { findCompany } from "@/lib/server/tavily";

export async function POST(req: Request) {
  try {
    const g = await guard(req, "company");
    if (!g.ok) return g.response;
    const company = typeof g.body.company === "string" ? g.body.company.replace(/\s+/g, " ").trim().slice(0, 100) : "";
    if (!company) return failed("error", { status: 400, message: MESSAGES.bad });
    return fromOutcome(await findCompany(company));
  } catch (err) {
    return failed(classify(err));
  }
}
