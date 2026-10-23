import { describe, expect, it } from "vitest";
import { EXAMPLES } from "@/lib/examples";
import { describeChange, score } from "@/lib/scoring/score";
import type { PostingData } from "@/lib/types";
import { company, daysAgo, facts, fromExample, input, sender } from "./helpers";

const ids = (r: ReturnType<typeof score>) => r.flags.map((f) => f.id);
const posting = (over: Partial<PostingData>): { status: "done"; data: PostingData } => ({
  status: "done",
  data: { found: true, url: "https://acme.com/jobs/1", title: "Marketing Intern", location: null, pay: null, postedDate: null, onOfficialDomain: true, ...over },
});

const MILD = "Hi Sam, I'm Dana from Acme. We'd love to chat about the Marketing Intern role next week. Let me know a few times that work for a short call, and I'll send an invite.";
const acmeFacts = facts({ company: { value: "Acme", quote: "I'm Dana from Acme" }, role: { value: "Marketing Intern", quote: "the Marketing Intern role" } });

describe("examples", () => {
  it("scam example lands high with critical flags", () => {
    const r = score(fromExample(EXAMPLES.scam));
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.level).toBe("high");
    const critical = r.flags.filter((f) => f.critical).map((f) => f.id);
    expect(critical).toEqual(expect.arrayContaining(["deposit_check", "buy_equipment"]));
    expect(r.flags.some((f) => f.kind === "good")).toBe(false);
  });

  it("real example lands low", () => {
    const r = score(fromExample(EXAMPLES.real));
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(24);
    expect(r.level).toBe("low");
    expect(r.flags.filter((f) => f.kind === "red")).toEqual([]);
    expect(r.postingMatch?.map((m) => m.row)).toEqual(["company", "role", "pay", "contact"]);
    expect(r.couldntCheck.map((c) => c.reason)).toContain("Upload a resume to add this check.");
  });
});

describe("score rules", () => {
  it("any critical flag sets a floor of 85 and good signs never apply", () => {
    const text = "Hi, thanks for applying to Acme. There is a $60 onboarding fee to start your internship.";
    const r = score(
      input({
        text,
        facts: facts({ company: { value: "Acme", quote: "thanks for applying to Acme" } }),
        source: "company_site",
        stage: "interviewing",
        steps: { company: company("acme.com"), sender: sender("hr@acme.com") },
      }),
    );
    expect(r.flags.find((f) => f.id === "pay_fee")?.critical).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.flags.some((f) => f.kind === "good")).toBe(false);
  });

  it("good signs are capped at -20 in total", () => {
    const text = "Hi Sam, from Acme: we need an answer within 24 hours. Reply YES to confirm the Marketing Intern interview.";
    const r = score(
      input({
        text,
        facts: facts({ company: { value: "Acme", quote: "from Acme" }, role: { value: "Marketing Intern", quote: "the Marketing Intern interview" } }),
        source: "company_site",
        steps: { company: company("acme.com"), sender: sender("dana@acme.com"), posting: posting({}) },
      }),
    );
    const red = r.flags.filter((f) => f.kind === "red").reduce((n, f) => n + f.points, 0);
    const good = r.flags.filter((f) => f.kind === "good").reduce((n, f) => n + f.points, 0);
    expect(good).toBeLessThan(-20); // -25 before the cap
    expect(r.score).toBe(red - 20);
  });

  it("clamps to 0-100", () => {
    expect(score(fromExample(EXAMPLES.scam)).score).toBeLessThanOrEqual(100);
    expect(score(fromExample(EXAMPLES.real)).score).toBe(0);
  });

  it("hiring-platform email for the company isn't a domain mismatch", () => {
    const cases: [string, string, boolean][] = [
      ["no-reply@acme.greenhouse.io", "greenhouse.io", true], // company in the subdomain
      ["acme@myworkdayjobs.com", "myworkdayjobs.com", true], // company in the local part
      ["no-reply@greenhouse.io", "greenhouse.io", false], // nothing ties it to Acme
    ];
    for (const [email, domain, fits] of cases) {
      const r = score(input({ text: MILD, facts: acmeFacts, steps: { company: company("acme.com"), sender: sender(email, { domain }) } }));
      expect(ids(r)).not.toContain("lookalike_domain");
      expect(ids(r).includes("hiring_platform"), email).toBe(fits);
      expect(r.flags.filter((f) => f.kind === "red")).toEqual([]);
      expect(r.level).toBe("low");
    }
    const viaPosting = score(
      input({
        text: MILD,
        facts: acmeFacts,
        steps: { company: company("acme.com"), sender: sender("no-reply@hire.lever.co", { domain: "lever.co" }), posting: posting({ url: "https://jobs.lever.co/acme/123", onOfficialDomain: false }) },
      }),
    );
    expect(ids(viaPosting)).toContain("hiring_platform");
  });

  it("Hunter: a throwaway address adds +15; no Hunter result means no check at all", () => {
    const hunter = { pattern: null, webmail: false, disposable: true };
    const r = score(input({ text: MILD, facts: acmeFacts, steps: { sender: sender("dana@tempmail.dev", { hunter }) } }));
    expect(r.flags.find((f) => f.id === "throwaway_email")?.points).toBe(15);
    const none = score(input({ text: MILD, facts: acmeFacts, steps: { sender: sender("dana@tempmail.dev") } }));
    expect(ids(none)).not.toContain("throwaway_email");
    expect(none.couldntCheck.map((c) => c.check.toLowerCase()).join(" ")).not.toMatch(/hunter|throwaway/);
  });

  it("staffing agency on an unrelated domain isn't flagged", () => {
    const r = score(input({ text: MILD, facts: acmeFacts, steps: { company: company("acme.com"), sender: sender("dana@toptalentstaffing.com") } }));
    expect(r.flags.filter((f) => f.group === "sender" && f.kind === "red")).toEqual([]);
  });

  it("university recruiters must match the exact university domain", () => {
    const ok = score(input({ text: MILD, facts: acmeFacts, steps: { company: company("umich.edu"), sender: sender("dana@umich.edu") } }));
    expect(ids(ok)).toContain("official_domain");
    const fake = score(input({ text: MILD, facts: acmeFacts, steps: { company: company("umich.edu"), sender: sender("dana@umich-careers.com") } }));
    expect(ids(fake)).toContain("lookalike_domain");
  });

  it("flags lookalike domains", () => {
    for (const d of ["acmelabs-careers.com", "acmelabs.co", "acmelabz.com"]) {
      const r = score(input({ text: MILD, facts: acmeFacts, steps: { company: company("acmelabs.com"), sender: sender(`hr@${d}`) } }));
      expect(ids(r), d).toContain("lookalike_domain");
    }
  });

  it("free email claiming a company: +25, or +12 for a startup", () => {
    const big = score(input({ text: MILD, facts: acmeFacts, steps: { sender: sender("dana.acme@gmail.com", { freeEmail: true, registeredAt: null }) } }));
    expect(big.flags.find((f) => f.id === "free_email")?.points).toBe(25);
    const small = score(input({ text: `${MILD} We're a small startup of three people.`, facts: acmeFacts, steps: { sender: sender("dana.acme@gmail.com", { freeEmail: true, registeredAt: null }) } }));
    expect(small.flags.find((f) => f.id === "free_email")?.points).toBe(12);
  });

  it("new website +15, never for free email; no MX +5", () => {
    const r = score(input({ text: MILD, facts: acmeFacts, steps: { company: company(null), sender: sender("dana@acme-hiring.net", { registeredAt: daysAgo(21), hasMx: false }) } }));
    const fresh = r.flags.find((f) => f.id === "new_domain");
    expect(fresh?.points).toBe(15);
    expect(fresh?.why).toContain("3 weeks ago");
    expect(r.flags.find((f) => f.id === "no_mx")?.points).toBe(5);
    const free = score(input({ text: MILD, facts: acmeFacts, steps: { sender: sender("dana@gmail.com", { freeEmail: true, registeredAt: daysAgo(5) }) } }));
    expect(ids(free)).not.toContain("new_domain");
  });

  it("posting mismatch only counts when the posting is on the official site; missing posting is neutral", () => {
    const base = { text: MILD, facts: acmeFacts };
    const steps = { company: company("acme.com"), sender: sender("dana@peoplehq.org") };
    const off = score(input({ ...base, steps: { ...steps, posting: posting({ title: "Senior Accountant" }) } }));
    expect(off.flags.find((f) => f.id === "posting_mismatch")?.points).toBe(10);
    const ats = score(input({ ...base, steps: { ...steps, posting: posting({ title: "Senior Accountant", onOfficialDomain: false }) } }));
    expect(ids(ats)).not.toContain("posting_mismatch");
    const missing = score(input({ ...base, steps: { ...steps, posting: posting({ found: false, title: null, url: null }) } }));
    const skipped = score(input({ ...base, steps }));
    expect(missing.score).toBe(skipped.score);
    expect(missing.postingMatch).toBeNull();
  });

  it("source: surprise text +25, applied first -10", () => {
    const text = MILD;
    expect(score(input({ text, facts: acmeFacts, source: "text_whatsapp" })).flags.find((f) => f.id === "surprise_text")?.points).toBe(25);
    expect(score(input({ text, facts: acmeFacts, source: "handshake" })).flags.find((f) => f.id === "applied_first")?.points).toBe(-10);
  });

  it("SSN/bank: critical before a signed offer, caution after one, critical again over chat", () => {
    const text = "Welcome aboard! Please enter your bank account details and a photo of your passport in our HR portal to finish onboarding.";
    const f = facts({ asks: [{ kind: "sensitive_data", quote: "Please enter your bank account details" }] });
    const byEmail = "Welcome aboard! Now that you've signed, reply to this email with your SSN and bank account details.";
    expect(score(input({ text: byEmail, stage: "signed", source: "email" })).flags.find((x) => x.id === "sensitive_data")?.critical).toBe(true);
    const before = score(input({ text, facts: f, stage: "offer" }));
    expect(before.flags.find((x) => x.id === "sensitive_data")?.critical).toBe(true);
    const after = score(input({ text, facts: f, stage: "signed" }));
    expect(after.flags.find((x) => x.id === "sensitive_data")?.critical).toBe(false);
    expect(after.score).toBeLessThan(60);
    const answered = score(input({ text, facts: f, answers: { signed_offer: "yes" } }));
    expect(answered.flags.find((x) => x.id === "sensitive_data")?.critical).toBe(false);
    const chat = score(input({ text, facts: f, stage: "signed", source: "text_whatsapp" }));
    expect(chat.flags.find((x) => x.id === "sensitive_data")?.critical).toBe(true);
  });

  it("drops AI facts whose quote isn't in the message", () => {
    const r = score(input({ text: MILD, facts: facts({ asks: [{ kind: "gift_cards", quote: "buy gift cards for the manager" }] }) }));
    expect(ids(r)).not.toContain("gift_cards");
    expect(r.level).toBe("low");
  });

  it("other AI concerns add at most 5 in total", () => {
    const text = "Hi. The pay is odd. The hours are odd. The title is odd. The office is odd.";
    const f = facts({ otherConcerns: [{ text: "Odd pay", quote: "The pay is odd" }, { text: "Odd hours", quote: "The hours are odd" }, { text: "Odd title", quote: "The title is odd" }] });
    const r = score(input({ text, facts: f }));
    expect(r.flags.filter((x) => x.id.startsWith("other_concern")).reduce((n, x) => n + x.points, 0)).toBe(5);
  });

  it("extract failed: the backstop still catches criticals and the gap is listed", () => {
    const text = EXAMPLES.scam.text;
    const r = score(input({ text, facts: null, steps: { extract: { status: "failed", reason: "timeout" } } }));
    expect(r.flags.filter((f) => f.critical).length).toBeGreaterThan(0);
    expect(r.level).toBe("high");
    expect(r.couldntCheck.map((c) => c.check)).toContain("Reading the message");
    expect(r.coverage.missingImportant).toContain("the message details");
  });

  it("levels: 0-24 low, 25-59 medium, 60+ high", () => {
    const pressure = "Hi from Acme. Please reply within 24 hours.";
    const r = score(input({ text: pressure, facts: null, steps: { extract: { status: "failed", reason: "error" } } }));
    expect(r.score).toBe(10);
    expect(r.level).toBe("low");
    expect(score(input({ text: pressure, facts: null, source: "text_whatsapp" })).level).toBe("medium");
  });

  it("field patterns add +8, plural wording included", () => {
    const r = score(input({ text: "We are hiring part-time mystery shoppers in your area for $250 per visit." }));
    expect(r.flags.find((f) => f.id === "field_pattern")?.points).toBe(8);
  });

  it("thin messages are marked", () => {
    const thin = score(input({ text: "Hi! Quick call about an internship?" }));
    const full = score(input({ text: MILD }));
    expect(thin.thinMessage).toBe(true);
    expect(thin.coverage.missingImportant).toContain("not much to check");
    expect(thin.coverage.ran).toBe(full.coverage.ran - 2);
    expect(full.coverage.missingImportant).not.toContain("not much to check");
    expect(score(fromExample(EXAMPLES.real)).thinMessage).toBe(false);
  });
});

describe("false positives on ordinary recruiter wording", () => {
  const BENIGN = [
    "Hi Sam, thanks for applying to Acme.",
    "Moving forward, payments are biweekly and we look forward to sharing more about the team.",
    "Please send the rest of your paperwork when you can, and the remaining documents by Friday.",
    "A valid driver's license is required for this role, and you'll create a password for your candidate portal.",
    "Your offer includes a signing bonus paid as a one-time payment.",
    "We'll pay for your laptop, and we reimburse certification fees.",
    "This is our Crypto Engineering Intern role, pay $45/hr.",
    "We never recruit over WhatsApp, and our team works on signal processing.",
    "It's only 10 hours a week, close to the urgent care clinic.",
    "You'll pick up code review tasks with the team.",
    "Fraud warning: we will never ask you to buy gift cards, deposit a check, or forward money, and we don't ask you to pay fees.",
  ].join(" ");

  it("a normal recruiter message with all of these stays below 25 with no critical flag", () => {
    const r = score(input({ text: BENIGN, source: "email" }));
    expect(r.flags.filter((f) => f.critical).map((f) => f.id)).toEqual([]);
    expect(r.flags.map((f) => f.id)).toEqual([]);
    expect(r.score).toBeLessThan(25);
  });

  it("a real scam after a fraud-warning footer still fires", () => {
    const text = `${BENIGN}\n\nTo get started we will mail you a check for $2,000. Deposit the check and send the balance to our vendor.`;
    const r = score(input({ text, source: "email" }));
    expect(r.flags.find((f) => f.id === "deposit_check")?.critical).toBe(true);
  });

  it("a negation further away doesn't cancel a fee", () => {
    const r = score(input({ text: "Not to worry, a training fee of $80 is all you need to start." }));
    expect(r.flags.find((f) => f.id === "pay_fee")?.critical).toBe(true);
  });

  it("the remote-position pattern only counts for surprise texts", () => {
    const text = "Hi, we have a remote position open on our team. Let me know if you're interested.";
    expect(score(input({ text, source: "text_whatsapp" })).flags.map((f) => f.id)).toContain("field_pattern");
    expect(score(input({ text, source: "linkedin" })).flags.map((f) => f.id)).not.toContain("field_pattern");
  });
});

describe("couldn't check", () => {
  it("lists failed and skipped steps with calm reasons, without changing the score", () => {
    const base = input({ text: MILD, facts: acmeFacts, steps: { company: company("acme.com"), sender: sender("dana@acme.com") } });
    const limited = { ...base, steps: { ...base.steps, company: { status: "failed", reason: "limit" } as const, posting: { status: "skipped", reason: "needs step 2" } as const } };
    const r = score(limited);
    const reasons = r.couldntCheck.map((c) => c.reason);
    expect(reasons).toContain("Couldn't check: the search service is busy.");
    expect(reasons).toContain("We need the company's official website to look for the posting.");
    expect(r.coverage.missingImportant).toContain("the company's website");
    const notFound = score({ ...base, steps: { ...base.steps, company: company(null) } });
    expect(notFound.couldntCheck.map((c) => c.reason)).toContain("We couldn't find an official website for this company.");
    expect(r.coverage.ran).toBeLessThan(r.coverage.total);
  });
});

describe("quick questions", () => {
  // v2 (findings 02 > 4.1): "source" became "channel" + "who_first"; "Not sure" replaces "I don't know".
  it("asks what they've asked you to do, and a ticked ask switches on a critical flag", () => {
    const first = score(input({ text: MILD, facts: acmeFacts }));
    const q = first.questions.find((x) => x.id === "asked_to_do");
    expect(q).toBeDefined();
    expect(q!.options).toContainEqual({ value: "unknown", label: "Not sure" });
    expect(first.couldntCheck.map((c) => c.check)).toContain("What they've asked you to do");

    const next = score(input({ text: MILD, facts: acmeFacts, answers: { asked_to_do: ["deposit_check"] } }));
    expect(next.level).toBe("high");
    expect(next.questions.map((x) => x.id)).not.toContain("asked_to_do");
  });

  it("\"Not sure\" keeps it under Couldn't check with no score change", () => {
    const first = score(input({ text: MILD, facts: acmeFacts }));
    const next = score(input({ text: MILD, facts: acmeFacts, answers: { asked_to_do: "unknown" } }));
    expect(next.score).toBe(first.score);
    expect(next.questions.map((x) => x.id)).not.toContain("asked_to_do");
    expect(next.couldntCheck.map((c) => c.check)).toContain("What they've asked you to do");
    expect(describeChange(first, next)).toBeNull();
  });

  it("asks about a signed offer only when sensitive data was asked for and the stage is unknown", () => {
    const text = "Welcome aboard! Please enter your bank account details in the HR portal.";
    const first = score(input({ text, source: "email" }));
    expect(first.questions.map((x) => x.id)).toContain("signed_offer");
    const next = score(input({ text, source: "email", answers: { signed_offer: "yes" } }));
    expect(next.score).toBeLessThan(first.score);
    expect(describeChange(first, next)).toBe("Score went down because you've signed an offer letter");
    expect(score(input({ text, source: "email", stage: "offer" })).questions.map((x) => x.id)).not.toContain("signed_offer");
  });

  // v2: "Is the employer outside the US?" is deleted; the chat-app penalty softens only when the user applied first.
  it("never asks about the employer's country; applying first softens the chat-app move", () => {
    const text = "Hi, I'm with Acme. Can we continue this on WhatsApp? I'd like to set up an interview.";
    const first = score(input({ text, source: "linkedin" }));
    expect(first.questions.map((x) => x.id)).not.toContain("outside_us");
    const applied = score(input({ text, source: "linkedin", answers: { who_first: "yes" } }));
    expect(applied.score).toBeLessThan(first.score);
  });

  // v2: shown only when an answer can flip the level (0 -> 20 stays low), but the answer still scores.
  it("a 'not yet' to talking live adds the no-interview flag", () => {
    const text = "Congratulations, you have been selected for the Acme design internship. Your start date is Monday.";
    const first = score(input({ text, source: "email", stage: "offer" }));
    expect(first.questions.map((x) => x.id)).not.toContain("talked_live");
    const next = score(input({ text, source: "email", stage: "offer", answers: { talked_live: "not_yet" } }));
    expect(next.score).toBe(first.score + 20);
    expect(describeChange(first, next)).toBe("Score went up because you haven't had an interview with them");
  });

  // v2: only the asks question remains (a ticked ask can switch on a critical); nothing about the source.
  it("never asks about the source when it's already known", () => {
    expect(score(fromExample(EXAMPLES.real)).questions.map((q) => q.id)).toEqual(["asked_to_do"]);
  });
});
