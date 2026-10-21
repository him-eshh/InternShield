import { getDomain } from "tldts";
import { FREE_EMAIL_DOMAINS } from "@/lib/constants";
import { hasMx } from "@/lib/server/dns";
import { guard } from "@/lib/server/guard";
import { classify, done, failed, MESSAGES } from "@/lib/server/http";
import { getHunterInsight } from "@/lib/server/hunter";
import { getRegistrationDate } from "@/lib/server/rdap";
import type { SenderData } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/;

export async function POST(req: Request) {
  try {
    const g = await guard(req, "sender");
    if (!g.ok) return g.response;
    const email = typeof g.body.email === "string" ? g.body.email.trim().toLowerCase().slice(0, 200) : "";
    const host = EMAIL_RE.exec(email)?.[1];
    if (!host) return failed("error", { status: 400, message: MESSAGES.bad });

    const domain = getDomain(host) ?? host;
    const freeEmail = FREE_EMAIL_DOMAINS.has(domain) || FREE_EMAIL_DOMAINS.has(host);

    const [registeredAt, mx, hunter] = await Promise.all([
      freeEmail ? Promise.resolve(null) : getRegistrationDate(domain),
      hasMx(domain),
      getHunterInsight(email),
    ]);

    const data: SenderData = { email, domain, freeEmail, registeredAt, hasMx: mx, hunter };
    return done(data);
  } catch (err) {
    return failed(classify(err));
  }
}
