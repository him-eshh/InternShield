// Auto-fill guesses from a pasted message (spec.md > Check Form and Auto-fill). Pure pattern matching.
import type { Source, Stage } from "./types";

export interface AutofillGuess {
  sender: string | null; // email, else phone
  company: string | null;
  source: Source | null;
  stage: Stage | null;
}

const FREE_DOMAINS = /^(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|msn|aol|icloud|me|mac|proton|protonmail|gmx|mail|zoho|yandex|qq|163|tutanota)\./i;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const WORD = "[A-Z][A-Za-z0-9&'-]*";
const NAME = `${WORD}(?: ${WORD}){0,3}`;
const STOP_FIRST = /^(The|Our|Your|My|This|That|Hi|Hello|Dear|We|It|I|You|Best|Thanks|Thank|Regards|Sincerely)$/;

function clean(name: string | undefined): string | null {
  if (!name) return null;
  const n = name.replace(/[\s,.;:-]+$/g, "").trim();
  if (n.length < 2 || STOP_FIRST.test(n.split(" ")[0])) return null;
  return n;
}

function guessSender(text: string): string | null {
  const email = text.match(EMAIL_RE);
  if (email) return email[0].replace(/[.,;:]+$/, "");
  const phone = text.match(PHONE_RE);
  return phone ? phone[0].trim() : null;
}

// ---------- Company vs department (Bug D; findings 02 §3.8, 05 Bug D) ----------
// Words that make a name a team or office, not a company ("University Recruiting", "Talent Acquisition group").
const DEPT_HEAD = new Set([
  "recruiting", "recruitment", "recruiter", "recruiters", "talent", "acquisition", "hr", "people", "ops", "operations",
  "hiring", "staffing", "careers", "career", "onboarding", "payroll", "team", "department", "dept", "office", "division",
]);
// Only a department word when a department word follows ("University Recruiting", but "Stanford University" stays).
const DEPT_MOD = new Set(["university", "campus", "early", "emerging", "student", "global", "corporate", "internal", "human", "the", "our", "your"]);
const PAIRS: Record<string, string[]> = { resources: ["human"], group: [...DEPT_HEAD], relations: ["university", "campus", "employee"] };
const ORG_SUFFIX = /\b(?:Inc|LLC|Ltd|Corp|Corporation|Co|GmbH|PLC|LLP|S\.A|Pvt|Technologies|Solutions|Labs|Systems|Consulting|Partners|Capital|Health|Bank|Group|Holdings|Analytics|Software|Ventures)\.?$/;
const PLATFORMS = /^(?:LinkedIn|Handshake|Indeed|Glassdoor|ZipRecruiter|Greenhouse|Lever|Workday|Ashby|WhatsApp|Telegram|Signal|Zoom|Teams|Google|Gmail|Outlook)$/i;
const TITLE_OR_DEPT = /\b(?:Recruit\w*|HR|Talent|Coordinator|Manager|Specialist|Director|Partner|Lead|Team|Staffing|People|Hiring|Human Resources|Campus|University|Careers?|Acquisition|Associate|Officer|Generalist|Sourcer)\b/;
const SIGN_OFF = /^(?:best|regards|thanks|thank you|sincerely|cheers|warmly|warm regards|best regards|kind regards|all the best|--|—)\b/i;

/**
 * Strips trailing department words: "Initech Recruiting" -> "Initech", "University Recruiting" -> "".
 * Returns the name unchanged when it has no department words.
 */
export function stripDepartment(name: string): string {
  const words = name.replace(/['’]s$/i, "").trim().split(/\s+/).filter(Boolean);
  let stripped = 0;
  for (;;) {
    const last = words.at(-1)?.toLowerCase().replace(/[.,]$/, "");
    if (!last) break;
    const prev = words.at(-2)?.toLowerCase();
    if (PAIRS[last] && prev && PAIRS[last].includes(prev)) words.splice(-2, 2);
    else if (DEPT_HEAD.has(last) || (stripped > 0 && DEPT_MOD.has(last))) words.pop();
    else break;
    stripped++;
  }
  while (words.length && /^(?:the|our|your)$/i.test(words[0])) words.shift();
  return words.join(" ").replace(/['’]s$/i, "");
}

/** True when the whole name is a team/office ("Talent Acquisition", "the People Team"), never a company. */
export function isDepartment(name: string): boolean {
  return name.trim() !== "" && stripDepartment(name) === "";
}

function domainLabel(sender: string | null): string | null {
  const domain = sender?.includes("@") ? sender.split("@")[1] ?? "" : "";
  if (!domain || FREE_DOMAINS.test(domain)) return null;
  const parts = domain.toLowerCase().split(".");
  return parts.length >= 2 ? parts[parts.length - 2] : null;
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Last lines after a sign-off ("Best regards,"), else the last 4 lines. */
function signatureLines(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let start = Math.max(0, lines.length - 4);
  for (let i = lines.length - 1; i >= Math.max(1, lines.length - 9); i--) {
    if (SIGN_OFF.test(lines[i])) {
      start = i + 1;
      break;
    }
  }
  return lines.slice(start, start + 8);
}

function guessCompany(text: string, sender: string | null): string | null {
  const scores = new Map<string, number>();
  const offer = (raw: string | undefined, points: number) => {
    const name = clean(raw ? stripDepartment(raw) : undefined);
    if (!name || PLATFORMS.test(name) || STOP_FIRST.test(name)) return;
    scores.set(name, Math.max(scores.get(name) ?? 0, points));
  };

  // Possessive is always the company: "Initech's Recruiting team".
  for (const m of text.matchAll(new RegExp(`(${NAME})['’]s (?:[A-Za-z]+ ){0,2}(?:[Tt]eam|[Dd]epartment|[Gg]roup|[Oo]ffice)\\b`, "g"))) offer(m[1], 3);
  // Signature: "HR Coordinator, Brightline Data Solutions" (title first), or a line ending in an org suffix.
  for (const line of signatureLines(text)) {
    if (/@|https?:|\d{3}/.test(line)) continue;
    const parts = line.split(/\s*(?:,|\||—|–| - )\s*/);
    const last = (parts.at(-1) ?? "").replace(/\.$/, "");
    if (parts.length > 1 && TITLE_OR_DEPT.test(parts.slice(0, -1).join(" ")) && new RegExp(`^${NAME}$`).test(last)) offer(last, 2);
    else if (new RegExp(`^${NAME}$`).test(line) && ORG_SUFFIX.test(line)) offer(line, 2);
  }
  // Body: "at/with/join/for X", and "the X team" with the department words stripped.
  for (const m of text.matchAll(new RegExp(`\\b(at|join|with) (${NAME})`, "g"))) offer(m[2], m[1] === "with" ? 0.5 : 1);
  for (const m of text.matchAll(new RegExp(`(${NAME}) (?:[A-Za-z]+ )?[Tt]eam\\b`, "g"))) offer(m[1], 1);

  const label = domainLabel(sender);
  if (label && label.length >= 2 && ![...scores.keys()].some((n) => squash(n).startsWith(label) || label.startsWith(squash(n)))) {
    offer(label.charAt(0).toUpperCase() + label.slice(1), 1);
  }

  // Bonuses: legal/org suffix, matches the email's website, mentioned more than once.
  const ranked = [...scores.entries()].map(([name, base]) => {
    const s = squash(name);
    const domainHit = label && (s === label || s.startsWith(label) || label.startsWith(s)) ? 3 : 0;
    const mentions = text.split(name).length - 1;
    return { name, score: base + (ORG_SUFFIX.test(name) ? 3 : 0) + domainHit + Math.min(2, Math.max(0, mentions - 1)) };
  });
  // A longer name that contains a shorter one wins ("Brightline Data Solutions" over "Brightline Data").
  for (const a of ranked) for (const b of ranked) if (a !== b && a.name.includes(b.name)) a.score = Math.max(a.score, b.score);
  ranked.sort((a, b) => b.score - a.score || b.name.length - a.name.length);
  const [top, next] = ranked;
  if (!top) return null;
  // Two different names with the same evidence: leave it empty (the company chip asks).
  if (next && next.score === top.score && !top.name.includes(next.name)) return null;
  return top.name;
}

function guessSource(text: string): Source | null {
  const t = text.toLowerCase();
  // Only clear "you applied to us" cues. Mentions of Handshake, LinkedIn or WhatsApp inside the body are
  // what scams say too ("we found your resume on Handshake", "add us on WhatsApp"), so they never pick a source.
  // Everything else stays null and the quick question asks.
  if (/(thank you for|thanks for) (your )?appl(ying|ication)/.test(t)) return "company_site";
  return null;
}

function guessStage(text: string): Stage | null {
  const t = text.toLowerCase();
  if (/(signed|sign) (the|your|my) offer|offer letter (is )?signed|i('ve| have) signed/.test(t)) return "signed";
  if (/pleased to offer|offer you|extend(ing)? (you )?an offer|offer letter|congratulations/.test(t)) return "offer";
  if (/(following|after) (our|your|the) interview|your interview (is|on|with)|schedule(d)? (your|an|the) interview|we interviewed|thanks for interviewing/.test(t)) return "interviewing";
  return null;
}

export function autofill(text: string): AutofillGuess {
  if (!text.trim()) return { sender: null, company: null, source: null, stage: null };
  const sender = guessSender(text);
  return { sender, company: guessCompany(text, sender), source: guessSource(text), stage: guessStage(text) };
}
