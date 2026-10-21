// Hand-written Report fixtures for building the UI before the engine lands.
// Shapes match lib/types.ts. Not used at runtime.
import type { Flag, Report } from "@/lib/types";

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

/** Medium report with quick questions and failed steps, for states the examples don't hit. */
export const mediumReport: Report = {
  score: 45,
  level: "medium",
  flags: [scamFlags[3], scamFlags[6]],
  groups: group([scamFlags[3], scamFlags[6]]),
  couldntCheck: [
    { check: "Sender's email website", reason: "Couldn't check: the lookup took too long." },
    { check: "Real job posting", reason: "Couldn't check: the search service is busy." },
  ],
  coverage: { ran: 6, total: 11, missingImportant: ["sender website"] },
  questions: [
    { id: "outside_us", text: "Is the employer based outside the US?",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unknown", label: "I don't know" }] },
    { id: "source", text: "Where did this message come from?",
      options: [{ value: "company_site", label: "I applied on their site" }, { value: "linkedin", label: "LinkedIn" },
        { value: "handshake", label: "Handshake" }, { value: "email", label: "Email" },
        { value: "text_whatsapp", label: "Surprise text or WhatsApp" }, { value: "unknown", label: "I don't know" }] },
  ],
  postingMatch: null,
  thinMessage: false,
};
