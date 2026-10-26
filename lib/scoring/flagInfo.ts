// Per-flag severity, one verification step, and one official page (research 01 > section 8).
// Links are pages the research pass opened. The AI never writes URLs; they come only from here.
import type { Flag } from "../types";

type Severity = NonNullable<Flag["severity"]>;
type Link = NonNullable<Flag["learnMore"]>;

const L = {
  jobs: { label: "FTC: job scams", url: "https://consumer.ftc.gov/articles/job-scams" },
  checks: { label: "FTC: fake check scams", url: "https://consumer.ftc.gov/articles/how-spot-avoid-and-report-fake-check-scams" },
  tasks: { label: "FTC: task scams", url: "https://consumer.ftc.gov/consumer-alerts/2025/08/how-spot-avoid-task-scams" },
  recruiters: {
    label: "FTC: fake recruiter scams",
    url: "https://consumer.ftc.gov/consumer-alerts/2023/08/scammers-impersonate-well-known-companies-recruit-fake-jobs-linkedin-other-job-platforms",
  },
  texts: { label: "FTC: job offer texts", url: "https://consumer.ftc.gov/consumer-alerts/2026/04/job-offer-text-probably-scam" },
  students: { label: "FTC: scams aimed at students", url: "https://consumer.ftc.gov/consumer-alerts/2025/05/college-students-avoid-scammers-while-you-job-hunt" },
  crypto: {
    label: "FBI: cryptocurrency job scams",
    url: "https://www.fbi.gov/how-we-can-help-you/victim-services/national-crimes-and-victim-resources/cryptocurrency-job-scams",
  },
  mules: { label: "FDIC OIG: money mule alert", url: "https://www.fdicoig.gov/alerts/public-service-alert-money-mules" },
} satisfies Record<string, Link>;

interface Info {
  action: string;
  learnMore: Link;
  severity?: Severity; // only when the points-based default is wrong
}

const CONTACT_OFFICIAL = "Contact the company using a phone number or email from its official website, not one from this message.";

export const FLAG_INFO: Record<string, Info> = {
  // Offer: critical asks
  pay_fee: { action: "Don't pay. Ask the company, using details from its official website, whether it charges this.", learnMore: L.jobs },
  buy_equipment: { action: "Don't buy anything yet. Ask the company through its official website how equipment is provided.", learnMore: L.recruiters },
  deposit_check: { action: "Don't deposit it. If you already did, call your bank now.", learnMore: L.checks },
  gift_cards: { action: "Don't buy gift cards. If you already did, contact the card company right away.", learnMore: L.jobs },
  crypto_or_task_deposit: { action: "Don't send crypto or top up an account. A real job never needs you to pay in first.", learnMore: L.crypto },
  reship_or_forward: { action: "Don't receive or forward packages or money. Ask your career center about this offer.", learnMore: L.jobs },
  money_wrong_way: { action: "Don't send money onward or use your own account for the company. If you did, call your bank.", learnMore: L.mules },
  run_code_or_install: { action: "Don't run it on your laptop. Ask for a hosted test, or use a throwaway virtual machine.", learnMore: L.jobs },
  untrusted_code: { action: "Confirm the take-home with the company first, then run it only in a hosted editor or a throwaway virtual machine.", learnMore: L.jobs },
  sensitive_data: { action: "Hold back your SSN and bank details until you've confirmed the employer and signed an offer.", learnMore: L.jobs },
  no_interview: { action: "Ask who will interview you and when. Real offers follow an interview.", learnMore: L.jobs },
  vague_easy_pay: { action: "Ask for a written job description and compare it with the company's own posting.", learnMore: L.jobs },
  field_pattern: { action: "Search the job title with the word scam, and check the company's careers page for the role.", learnMore: L.tasks },
  payment_duties: { action: "Don't accept payments or buy anything for them. Ask your career center about this offer.", learnMore: L.checks },
  role_above_level: { action: "Compare the requirements with the company's own posting before replying.", learnMore: L.jobs },
  posting_mismatch: { action: "Email the company at an address from its careers page and ask about the role and pay.", learnMore: L.jobs },

  // Message
  off_platform: { action: "Ask to keep talking by email or the company's own system, and find the recruiter on the company's website.", learnMore: L.recruiters },
  reply_yes: { action: "Don't reply. Look for the job on the company's official careers page.", learnMore: L.texts },
  surprise_text: { action: "Don't reply to the text. Look for the job on the company's official careers page.", learnMore: L.texts },
  pressure: { action: "Take your time. A real employer will wait while you check.", learnMore: L.jobs },
  generic_greeting: { action: "Look the recruiter up on LinkedIn and on the company's staff page.", learnMore: L.recruiters },
  hidden_characters: { action: "Treat the sender with extra care and check the company on its own website.", learnMore: L.jobs },
  other_concern: { action: "Ask the company about this using contact details from its own website.", learnMore: L.jobs },
  link_lookalike: { action: "Don't click it. Type the company's website yourself and find the job there.", learnMore: L.recruiters },
  link_punycode: { action: "Don't click it. Type the company's website yourself.", learnMore: L.recruiters },
  link_raw_ip: { action: "Don't click it. Type the company's website yourself.", learnMore: L.recruiters },
  link_google_form: { action: "Don't fill it in. Apply through the company's own careers page.", learnMore: L.jobs },
  link_shortener: { action: "Don't click it. Find the job on the company's careers page instead.", learnMore: L.jobs },

  secrecy: { action: "Don't keep it secret. Talk to your bank, your school's career center, or someone you trust before you do anything.", learnMore: L.mules },
  impersonation: { action: "Email the office at the address on the university or agency's own website, not the one in this message.", learnMore: L.students },
  visa_threat: { action: "Don't pay or reply. Check your status with your school's international office, using details from its own website.", learnMore: L.students },
  paperwork_too_early: { action: "Wait for a signed offer. Then fill in tax and work forms only in the company's official HR portal.", learnMore: L.jobs },

  // Sender
  free_email: { action: "Find this recruiter on the company's careers page or LinkedIn, then email them at the company's domain.", learnMore: L.recruiters },
  lookalike_domain: { action: "Type the company's website yourself and find the recruiter there. Don't use links from the message.", learnMore: L.recruiters },
  new_domain: { action: CONTACT_OFFICIAL, learnMore: L.recruiters },
  throwaway_email: { action: "Write to the recruiter at a company address listed on the official website.", learnMore: L.recruiters },
  no_mx: { action: "Email the company at an address from its official website instead.", learnMore: L.recruiters },

  // Good signs
  applied_first: { action: "Keep using the channel where you applied, and still check the recruiter's address.", learnMore: L.jobs },
  official_domain: { action: "Still keep private details for an official HR portal after you sign an offer.", learnMore: L.jobs },
  hiring_platform: { action: "Still check that the role is on the company's own careers page.", learnMore: L.jobs },
  posting_found: { action: "Apply or reply through the link on the company's own careers page.", learnMore: L.jobs },
};

const FALLBACK: Info = { action: CONTACT_OFFICIAL, learnMore: L.jobs };

/** Severity: critical flags are critical; otherwise points decide (25+ high, 10+ medium, else low) unless the table says so. */
export function severityOf(f: Pick<Flag, "id" | "critical" | "kind" | "points">): Severity {
  if (f.critical) return "critical";
  const override = (FLAG_INFO[f.id.replace(/_\d+$/, "")] ?? FLAG_INFO[f.id])?.severity;
  if (override) return override;
  if (f.kind === "good") return "low";
  const p = Math.abs(f.points);
  return p >= 25 ? "high" : p >= 10 ? "medium" : "low";
}

/** The flag with severity, action, and learnMore filled in (existing values are kept). */
export function withFlagInfo(f: Flag): Flag {
  const info = FLAG_INFO[f.id] ?? FLAG_INFO[f.id.replace(/_\d+$/, "")] ?? FALLBACK;
  return {
    ...f,
    severity: f.severity ?? severityOf(f),
    action: f.action ?? info.action,
    learnMore: f.learnMore ?? info.learnMore,
  };
}
