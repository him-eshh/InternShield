import { guard } from "@/lib/server/guard";
import { classify, failed, fromOutcome, MESSAGES } from "@/lib/server/http";
import { findPosting } from "@/lib/server/tavily";

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

export async function POST(req: Request) {
  try {
    const g = await guard(req, "posting");
    if (!g.ok) return g.response;
    const company = clean(g.body.company, 100);
    const role = clean(g.body.role, 100) || null;
    const officialDomain = clean(g.body.officialDomain, 100).toLowerCase();
    if (!company || !officialDomain) return failed("error", { status: 400, message: MESSAGES.bad });
    return fromOutcome(await findPosting(company, role, officialDomain));
  } catch (err) {
    return failed(classify(err));
  }
}
