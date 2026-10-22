// Rules 7-10 (research 01 > section 9): secrecy, impersonated institutions, early paperwork, more platforms.
import { describe, expect, it } from "vitest";
import { score } from "@/lib/scoring/score";
import { isHiringPlatform } from "@/lib/scoring/domains";
import { FLAG_INFO } from "@/lib/scoring/flagInfo";
import { facts, input, sender } from "./helpers";
import type { ScoreInput, StepResults } from "@/lib/types";

type Over = Partial<Omit<ScoreInput, "steps">> & { steps?: Partial<StepResults> };
const run = (text: string, over: Over = {}) => score(input({ text, source: "email", ...over }));
const ids = (text: string, over: Over = {}) => run(text, over).flags.map((f) => f.id);

describe("rule 7: secrecy", () => {
  it.each([
    "Please don't tell your bank why you are moving this money.",
    "Do not tell anyone about this opportunity until we start.",
    "Keep this confidential from your school and your advisor.",
    "Keep it between us for now, okay?",
    "Do not contact HR or the company directly about this.",
    "If the bank asks, just say it is a gift from family.",
  ])("fires: %s", (text) => {
    const f = run(text).flags.find((x) => x.id === "secrecy");
    expect(f?.points).toBe(20);
    expect(f?.critical).toBe(false);
  });

  it("near misses: a fraud warning, and ordinary confidentiality", () => {
    expect(ids("We will never ask you to keep this secret from your bank.")).not.toContain("secrecy");
    expect(ids("Your offer details are confidential, so please keep this email private until the announcement.")).not.toContain("secrecy");
    expect(ids("Feel free to tell your family and your career center about the role.")).not.toContain("secrecy");
  });
});

describe("rule 8: impersonated university, government, immigration", () => {
  const prof = "Hello, this is Professor Kim from the Department of Biology. I have a paid research assistant opening for you.";
  const bad = (email: string) => ({ steps: { sender: sender(email) } });

  it("fires +30 when the sender is not the exact .edu", () => {
    const r = run(prof, bad("kim.professor@mail.example"));
    expect(r.flags.find((f) => f.id === "impersonation")?.points).toBe(30);
  });

  it("fires on a 'via' relay even from a .edu-looking name", () => {
    const r = run(`${prof} Sent via Sendinblue.`, bad("kim@bio.example.edu"));
    expect(r.flags.map((f) => f.id)).toContain("impersonation");
  });

  it("fires for USCIS / immigration from a non-.gov sender", () => {
    const t = "This is the USCIS Immigration Services office. We need to confirm your work authorization today.";
    expect(run(t, bad("officer@uscis-help.example")).flags.map((f) => f.id)).toContain("impersonation");
  });

  it("a visa-status threat is +25", () => {
    const t = "Your OPT status will be terminated unless you respond to this notice.";
    const f = run(t, bad("dso@help.example")).flags.find((x) => x.id === "visa_threat");
    expect(f?.points).toBe(25);
    expect(f?.critical).toBe(false);
  });

  it("with a payment ask it is critical", () => {
    const t = "This is the USCIS Immigration Services office. Your visa status will be terminated unless you pay a $150 reinstatement amount.";
    const r = run(t, bad("officer@uscis-help.example"));
    expect(r.flags.some((f) => (f.id === "impersonation" || f.id === "visa_threat") && f.critical)).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(85);
  });

  it("counts less beside a free-email flag, and not at all beside a look-alike sender", () => {
    const f = facts({ company: { value: "Cedar University", quote: "Cedar University" } });
    const r = run(`${prof} Cedar University is hiring.`, { facts: f, steps: { sender: sender("kim@gmail.com", { freeEmail: true }) } });
    expect(r.flags.find((x) => x.id === "impersonation")?.points).toBe(10);
    const co = { status: "done", data: { officialDomain: "cedar.edu", careersUrl: null } } as never;
    const l = run(prof, { facts: f, steps: { sender: sender("kim@cedar-edu.example"), company: co } });
    expect(l.flags.map((x) => x.id)).not.toContain("impersonation");
  });

  it("near misses: exact .edu, .gov, hiring platforms, unknown sender, company that merely mentions a school", () => {
    expect(ids(prof, bad("kim@umich.edu"))).not.toContain("impersonation");
    expect(ids("This is the USCIS office. Please bring your documents.", bad("noreply@uscis.gov"))).not.toContain("impersonation");
    expect(ids(prof, bad("kim@u.example.ac.uk"))).not.toContain("impersonation");
    expect(ids(prof, bad("no-reply@greenhouse.io"))).not.toContain("impersonation");
    expect(ids(prof)).not.toContain("impersonation");
    expect(ids("I'm a recruiter at Northwind. We hire from your career center and from Michigan.", bad("a@northwind.example"))).not.toContain("impersonation");
    expect(ids("Your OPT status will be terminated if you do not report your employer in SEVP portal by the deadline.", bad("dso@umich.edu"))).not.toContain("visa_threat");
  });
});

describe("rule 9: hiring paperwork before an offer", () => {
  const t = "Great chat! Before anything else, please fill out the I-9 and W-4 and send the direct deposit form.";

  it("fires +20 with no signed offer", () => {
    const f = run(t, { stage: "message" }).flags.find((x) => x.id === "paperwork_too_early");
    expect(f?.points).toBe(20);
    expect(f?.critical).toBe(false);
  });

  it("is critical with a fee", () => {
    const r = run("To process your I-9 paperwork there is a charge, so you must pay us $45 first.", { stage: "message" });
    const f = r.flags.find((x) => x.id === "paperwork_too_early");
    expect(f?.critical).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(85);
  });

  it("does not double count a background-check fee already caught as pay_fee", () => {
    const r = run("Please pay the background check fee of $50 before your I-9 forms.", { stage: "message" });
    expect(r.flags.map((f) => f.id)).toContain("pay_fee");
    expect(r.flags.map((f) => f.id)).not.toContain("paperwork_too_early");
  });

  it("near misses: signed offer, offer stage, signed-offer answer", () => {
    expect(ids(t, { stage: "signed" })).not.toContain("paperwork_too_early");
    expect(ids(t, { stage: "offer" })).not.toContain("paperwork_too_early");
    expect(ids(t, { answers: { signed_offer: "yes" } })).not.toContain("paperwork_too_early");
    expect(ids("Thanks for signing your offer letter. Please complete the I-9 in Workday on day one.")).not.toContain("paperwork_too_early");
    expect(ids("Interns are paid every two weeks, so we need your hours. See the handbook for pay dates.")).not.toContain("paperwork_too_early");
  });
});

describe("rule 10: more hiring platforms, and confirmed interview texts", () => {
  it.each(["rippling.com", "gem.com", "applytojob.com", "breezy.hr", "pinpointhq.com", "teamtailor.com", "recruitee.com", "workable.com", "myworkdayjobs.com"])(
    "%s counts as a hiring platform",
    (d) => expect(isHiringPlatform(d)).toBe(true),
  );

  it("gives the good sign when the address names the company", () => {
    const f = facts({ company: { value: "Northwind", quote: "Northwind" } });
    const r = run("Hi, Northwind would like to move you to the next step.", {
      facts: f,
      steps: { sender: sender("northwind@teamtailor.com") },
    });
    expect(r.flags.find((x) => x.id === "hiring_platform")?.points).toBe(-5);
    expect(r.flags.map((x) => x.id)).not.toContain("lookalike_domain");
  });

  const sms = "Hi Sam, your interview with Northwind is scheduled for Tuesday at 2:00 PM. Reply YES to confirm.";
  it("scores the reply-YES pattern 0 when you applied and the text names a scheduled interview", () => {
    expect(ids(sms, { source: "text_whatsapp", answers: { who_first: "yes" } })).not.toContain("reply_yes");
    expect(ids(sms, { source: "text_whatsapp", answers: { who_first: "yes" } })).not.toContain("surprise_text");
    const withFact = facts({ asks: [{ kind: "reply_yes", quote: "Reply YES to confirm" }] });
    expect(ids(sms, { source: "text_whatsapp", facts: withFact, answers: { who_first: "yes" } })).not.toContain("reply_yes");
  });

  it("an applied stage also counts", () => {
    expect(ids(sms, { source: "text_whatsapp", stage: "interviewing" })).not.toContain("reply_yes");
  });

  it("still flags reply-YES when you did not apply or no interview is named", () => {
    expect(ids(sms, { source: "text_whatsapp", answers: { who_first: "no" } })).toContain("reply_yes");
    expect(ids(sms, { source: "text_whatsapp" })).toContain("reply_yes");
    expect(ids("Remote job paying $400 a day. Reply YES to learn more.", { source: "text_whatsapp", answers: { who_first: "yes" } })).toContain("reply_yes");
  });
});

describe("flag info for the new flags", () => {
  it.each(["secrecy", "impersonation", "visa_threat", "paperwork_too_early"])("%s has one action and one link", (id) => {
    const i = FLAG_INFO[id];
    expect(i.action.length).toBeGreaterThan(10);
    expect(i.learnMore.url).toMatch(/^https:\/\//);
    expect(`${i.action} ${i.learnMore.label}`).not.toMatch(/\b(?:safe|legit|legitimate)\b/i);
  });
});
