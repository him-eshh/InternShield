// Slice 7.6: quick questions show up for realistic (made-up) messages, not just synthetic ones.
import { describe, expect, it } from "vitest";
import { score } from "@/lib/scoring/score";
import { facts, input } from "./helpers";

/** A plausible recruiter outreach. The user picked no source and no stage. */
const RECRUITER_TEXT =
  "Hi Jordan, I'm Priya from the campus recruiting team at Northbeam Analytics. We came across your profile and think " +
  "you could be a great fit for our Summer 2027 Data Analyst Internship. Would you be open to a 20 minute call later " +
  "this week to talk about the team and the role? Thanks, Priya";

const recruiterInput = () =>
  input({
    text: RECRUITER_TEXT,
    facts: facts({
      company: { value: "Northbeam Analytics", quote: "Northbeam Analytics" },
      role: { value: "Data Analyst Intern", quote: "Data Analyst Internship" },
      sender: { name: "Priya", email: null, phone: null },
    }),
  });

/** A medium-risk "you're hired" note with no interview mentioned either way. */
const OFFER_TEXT =
  "Congratulations! After reviewing your resume, you have been selected for the remote Marketing Assistant role at " +
  "Larkspur Home Goods. The pay is $28 per hour, part time, and your start date is next Monday. Please reply to this " +
  "email with your availability so our HR team can send the onboarding details.";

const offerInput = () =>
  input({
    text: OFFER_TEXT,
    facts: facts({
      company: { value: "Larkspur Home Goods", quote: "Larkspur Home Goods" },
      role: { value: "Marketing Assistant", quote: "Marketing Assistant" },
      pay: { value: "$28 per hour", quote: "$28 per hour" },
    }),
  });

describe("quick questions on realistic messages", () => {
  it("asks where a recruiter message came from when no source was picked", () => {
    const r = score(recruiterInput());
    expect(r.questions.map((q) => q.id)).toContain("source");
    expect(r.couldntCheck.map((c) => c.check)).toContain("Where the message came from");
  });

  it("the source answer really moves the score both ways", () => {
    const base = score(recruiterInput()).score;
    const text = score({ ...recruiterInput(), answers: { source: "text_whatsapp" } });
    const applied = score({ ...recruiterInput(), answers: { source: "company_site" } });
    expect(text.score).toBeGreaterThan(base);
    expect(applied.score).toBeLessThanOrEqual(base);
    expect(text.questions.map((q) => q.id)).not.toContain("source");
  });

  it("asks about the interview on a 'you've been selected' message", () => {
    const r = score(offerInput());
    const ids = r.questions.map((q) => q.id);
    expect(ids).toContain("had_interview");
    expect(ids).toContain("source");
    const noInterview = score({ ...offerInput(), answers: { had_interview: "no" } });
    expect(noInterview.score).toBeGreaterThan(r.score);
    expect(noInterview.flags.map((f) => f.id)).toContain("no_interview");
  });

  it("'I don't know' counts as answered and stays a couldn't-check line", () => {
    const r = score({ ...recruiterInput(), answers: { source: "unknown" } });
    expect(r.questions.map((q) => q.id)).not.toContain("source");
    expect(r.couldntCheck.map((c) => c.check)).toContain("Where the message came from");
  });

  it("no source question once the user picked one on the form", () => {
    const r = score({ ...recruiterInput(), source: "linkedin" });
    expect(r.questions.map((q) => q.id)).not.toContain("source");
  });
});
