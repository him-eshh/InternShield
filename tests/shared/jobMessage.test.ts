import { describe, expect, it } from "vitest";
import { hasJobContext } from "@/lib/jobMessage";
import { emptyFacts, quoteCheck } from "@/lib/server/extract";

export const HIRING_NOTICES = [
  "An employer viewed your profile. Sign in to see who is interested.",
  "Your profile was viewed by an employer this week.",
  "Example Company invited you to apply. View the opportunity on Handshake.",
  "Greenhouse: Thank you for applying. We received your application.",
  "Workday: Your application status has changed. Sign in for details.",
  "We will not be moving forward with your application. Thank you for your time.",
  "Could we talk next week? Alex Example | Technical Recruiter | Example Company",
  "Lever: Please confirm your availability for an interview next Tuesday.",
  "Handshake: Explore employers and openings that match your interests.",
  "We are hiring remote research assistants. Please send your resume.",
];

describe("job-message gate", () => {
  it.each(HIRING_NOTICES)("rescues hiring context rejected by the model: %s", (text) => {
    expect(hasJobContext(text)).toBe(true);
    expect(quoteCheck({ isJobMessage: false }, text)).toEqual(emptyFacts(true));
  });
  it.each([
    "Happy birthday! See you at dinner on Friday.",
    "Our weekly cooking newsletter: three new pasta recipes.",
    "Save 30% on running shoes. Shop our sale today.",
    "Handshake premium is on sale. Upgrade your subscription today.",
    "The mobile application now supports dark mode. Download the update.",
  ])("keeps clearly unrelated content rejected: %s", (text) => {
    expect(hasJobContext(text)).toBe(false);
    expect(quoteCheck({ isJobMessage: false }, text)).toEqual(emptyFacts(false));
  });
});
