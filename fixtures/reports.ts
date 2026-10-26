// Fabricated development reports for checking UI states; medium is scored from its message and facts.
import { score } from "@/lib/scoring/score";
import type { Facts, Flag, Report, StepResults } from "@/lib/types";

const scamFlags: Flag[] = [
  { id: "deposit_check", group: "offer", kind: "red", critical: true, points: 0, title: "Asks you to deposit a check and send money on",
    quote: "Once you deposit the check, send the remaining balance to the vendor",
    why: "Real employers never send a check and ask you to pass money along. The check bounces and you lose what you sent." },
  { id: "buy_equipment", group: "offer", kind: "red", critical: true, points: 0, title: "Asks you to buy equipment",
    quote: "we will mail you a check for $2,850 to purchase your work equipment",
    why: "Real jobs ship you equipment or pay for it directly. They don't make you buy it from their vendor." },
  { id: "free_email_established", group: "sender", kind: "red", critical: false, points: 25, title: "Sent from a free email address",
    quote: null, why: "This email's website is gmail.com. Companies with recruiters use their own email address." },
  { id: "off_platform", group: "message", kind: "red", critical: false, points: 20, title: "Moves you to WhatsApp",
    quote: "Please add our hiring manager on WhatsApp at +1 (213) 555-0147", why: "Scammers move you to chat apps where they're harder to trace." },
  { id: "no_interview", group: "offer", kind: "red", critical: false, points: 20, title: "Hired with no interview",
    quote: "you will be hired directly without an interview", why: "Real employers talk to you before offering a job." },
  { id: "vague_high_pay", group: "offer", kind: "red", critical: false, points: 15, title: "Vague duties, high pay, no experience",
    quote: "Your duties will be simple tasks assigned weekly by your supervisor", why: "Easy work with high pay and no requirements is a classic lure." },
  { id: "pressure", group: "message", kind: "red", critical: false, points: 10, title: "Pressure to act fast",
    quote: "This offer is only available for the next 24 hours", why: "Deadlines like this are meant to stop you from checking." },
];

const group = (flags: Flag[]) => ({
  sender: flags.filter((f) => f.group === "sender"),
  message: flags.filter((f) => f.group === "message"),
  offer: flags.filter((f) => f.group === "offer"),
});

export const scamReport: Report = {
  score: 100,
  level: "high",
  flags: scamFlags,
  groups: group(scamFlags),
  couldntCheck: [
    { check: "Company website match", reason: "We couldn't find an official website for this company." },
    { check: "Real job posting", reason: "Skipped because the company's website wasn't found." },
    { check: "Role vs. your level", reason: "Upload a resume to add this check." },
  ],
  coverage: { ran: 8, total: 11, missingImportant: ["company website"] },
  questions: [],
  postingMatch: null,
  thinMessage: false,
};

const realFlags: Flag[] = [
  { id: "real_domain", group: "sender", kind: "good", critical: false, points: -10, title: "Sent from the company's real website",
    quote: null, why: "The email comes from stripe.com, the same website as Stripe's official careers page.", sourceUrl: "https://stripe.com/jobs" },
  { id: "applied_first", group: "message", kind: "good", critical: false, points: -10, title: "You applied first",
    quote: "Thanks for applying to the Software Engineering Intern (Summer 2027) role", why: "You started this conversation through the official site." },
  { id: "posting_found", group: "offer", kind: "good", critical: false, points: -5, title: "Role found on the company's own careers site",
    quote: null, why: "A matching posting is listed on stripe.com.", sourceUrl: "https://stripe.com/jobs/search?query=intern" },
];

export const realReport: Report = {
  score: 0,
  level: "low",
  flags: realFlags,
  groups: group(realFlags),
  couldntCheck: [{ check: "Role vs. your level", reason: "Upload a resume to add this check." }],
  coverage: { ran: 10, total: 11, missingImportant: [] },
  questions: [],
  postingMatch: [
    { row: "company", message: "Stripe", posting: "Stripe", ok: true },
    { row: "role", message: "Software Engineering Intern (Summer 2027)", posting: "Software Engineering Intern", ok: true },
    { row: "pay", message: null, posting: null, ok: null },
    { row: "contact", message: "stripe.com", posting: "stripe.com", ok: true },
  ],
  thinMessage: false,
};

/** Medium state with honest failed-check copy, scored from the same evidence shown in its message. */
const mediumFacts: Facts = {
  isJobMessage: true,
  company: { value: "Northbeam Analytics", quote: "Northbeam Analytics" },
  role: { value: "Software Engineering Intern", quote: "Software Engineering Intern opening" },
  pay: null,
  sender: { name: "Morgan Lee", email: "recruiting@northbeam.example", phone: "+1 (213) 555-0147" },
  asks: [],
  offPlatform: { app: "WhatsApp", quote: "Please add our hiring manager on WhatsApp at +1 (213) 555-0147" },
  pressure: [{ quote: "This interview slot is only available for the next 24 hours" }],
  interview: { status: "mentioned", quote: "schedule a short interview this week" },
  dutiesVague: null,
  noExperienceNeeded: null,
  employerCountryHint: null,
  otherConcerns: [],
};
const mediumSteps: StepResults = {
  extract: { status: "done", data: mediumFacts },
  company: { status: "failed", reason: "timeout" },
  sender: { status: "failed", reason: "limit", retryAfter: 20 },
  posting: { status: "skipped", reason: "needs step 2" },
};
export const mediumFixture = {
  text: `Hi Alex,

I'm Morgan Lee with Northbeam Analytics. Your portfolio looked relevant to our Software Engineering Intern opening. We'd like to schedule a short interview this week.

Please add our hiring manager on WhatsApp at +1 (213) 555-0147 to arrange a time. This interview slot is only available for the next 24 hours, so please reply soon.

Morgan Lee
recruiting@northbeam.example`,
  form: { sender: "recruiting@northbeam.example", company: "Northbeam Analytics" },
  source: "linkedin" as const,
  stage: "message" as const,
  facts: mediumFacts,
  steps: mediumSteps,
};
export const mediumReport: Report = score({
  text: mediumFixture.text,
  facts: mediumFacts,
  steps: mediumSteps,
  profile: null,
  resumeText: null,
  source: mediumFixture.source,
  stage: mediumFixture.stage,
  answers: {},
  form: mediumFixture.form,
});
