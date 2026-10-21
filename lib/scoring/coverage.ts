// Which checks ran, weighted by importance, plus Couldn't-check lines for the ones that didn't.
// None of this changes the score.
import type { FailReason, Report, ScoreInput, StepResult } from "../types";

type Gap = { check: string; reason: string };

interface CheckDef {
  name: string; // Couldn't-check title
  short: string; // for coverage.missingImportant
  weight: number;
  important: boolean;
}

const CHECKS = {
  message: { name: "Reading the message", short: "the message details", weight: 3, important: true },
  scan: { name: "Scanning for the biggest warning signs", short: "the warning-sign scan", weight: 1, important: false },
  sender: { name: "Sender's email website", short: "the sender's website", weight: 3, important: true },
  company: { name: "Company's official website", short: "the company's website", weight: 3, important: true },
  posting: { name: "Real job posting", short: "the job posting", weight: 1, important: false },
  age: { name: "When the sender's website was created", short: "the website's age", weight: 1, important: false },
  mx: { name: "Whether the sender's website gets email", short: "the email check", weight: 1, important: false },
  level: { name: "Role vs your experience", short: "your experience", weight: 1, important: false },
} satisfies Record<string, CheckDef>;

type CheckKey = keyof typeof CHECKS;

function failText(reason: FailReason, service: string): string {
  if (reason === "timeout") return `Couldn't check: ${service} took too long. Try again in a moment.`;
  if (reason === "limit") return `Couldn't check: ${service} is busy.`;
  return `Couldn't check: something went wrong with ${service}. Try again in a moment.`;
}

function failedOf<T>(step: StepResult<T>): FailReason | null {
  return step.status === "failed" ? step.reason : null;
}

export function buildCoverage(
  input: ScoreInput,
  derived: { senderEmailKnown: boolean },
): { couldntCheck: Gap[]; coverage: Report["coverage"] } {
  const { steps } = input;
  const gaps: Gap[] = [];
  const ran: Record<CheckKey, boolean> = {
    message: steps.extract.status === "done" && input.facts !== null,
    scan: true,
    sender: steps.sender.status === "done",
    company: steps.company.status === "done" && steps.company.data !== null,
    posting: steps.posting.status === "done",
    age: steps.sender.status === "done" && (steps.sender.data.freeEmail || steps.sender.data.registeredAt !== null),
    mx: steps.sender.status === "done" && steps.sender.data.hasMx !== null,
    level: input.profile !== null && input.resumeText !== null,
  };

  // Reading the message
  const extractFail = failedOf(steps.extract);
  if (!ran.message) {
    const lead = extractFail ? failText(extractFail, "the message reader") : "Couldn't read the message details.";
    gaps.push({ check: CHECKS.message.name, reason: `${lead} We still scanned it for the biggest warning signs.` });
  }

  // Company website
  if (steps.company.status === "failed") {
    gaps.push({ check: CHECKS.company.name, reason: failText(steps.company.reason, "the search service") });
  } else if (steps.company.status === "skipped") {
    gaps.push({ check: CHECKS.company.name, reason: "No company name was found in the message. Add it if you know it." });
  } else if (steps.company.data === null) {
    gaps.push({ check: CHECKS.company.name, reason: "We couldn't find an official website for this company." });
  }

  // Sender website, age, email
  if (steps.sender.status === "failed") {
    gaps.push({ check: CHECKS.sender.name, reason: failText(steps.sender.reason, "the email lookup") });
  } else if (steps.sender.status === "skipped") {
    gaps.push({
      check: CHECKS.sender.name,
      reason: derived.senderEmailKnown
        ? "We couldn't look up the sender's email website."
        : "No sender email was found. Add it if you have it.",
    });
  } else {
    const d = steps.sender.data;
    if (!d.freeEmail && d.registeredAt === null) {
      gaps.push({ check: CHECKS.age.name, reason: "We couldn't look up when this website was created." });
    }
    if (d.hasMx === null) {
      gaps.push({ check: CHECKS.mx.name, reason: "We couldn't check if this website can receive email." });
    }
  }

  // Posting
  if (steps.posting.status === "failed") {
    gaps.push({ check: CHECKS.posting.name, reason: failText(steps.posting.reason, "the search service") });
  } else if (steps.posting.status === "skipped") {
    gaps.push({
      check: CHECKS.posting.name,
      reason:
        steps.posting.reason === "missing input"
          ? "We need the company name to look for the posting."
          : "We need the company's official website to look for the posting.",
    });
  }

  // Level
  if (input.resumeText === null) {
    gaps.push({ check: CHECKS.level.name, reason: "Upload a resume to add this check." });
  } else if (input.profile === null) {
    gaps.push({ check: CHECKS.level.name, reason: "Add your profile to add this check." });
  }

  const keys = Object.keys(CHECKS) as CheckKey[];
  return {
    couldntCheck: gaps,
    coverage: {
      ran: keys.reduce((n, k) => n + (ran[k] ? CHECKS[k].weight : 0), 0),
      total: keys.reduce((n, k) => n + CHECKS[k].weight, 0),
      missingImportant: keys.filter((k) => CHECKS[k].important && !ran[k]).map((k) => CHECKS[k].short),
    },
  };
}
