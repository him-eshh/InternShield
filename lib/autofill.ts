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

function guessCompany(text: string, sender: string | null): string | null {
  // Signature line: "HR Coordinator, Brightline Data Solutions" or "Jane — Acme Recruiting"
  const sig = new RegExp(`^[^\\n]{0,60}?(?:Recruit\\w*|HR|Talent|Coordinator|Manager|Team|Staffing|People)[^\\n,—–]{0,30}[,—–-]\\s*(${NAME})\\s*$`, "m");
  const sigName = clean(text.match(sig)?.[1]);
  if (sigName) return sigName;

  const at = clean(text.match(new RegExp(`\\b(?:at|with|join) (${NAME})`))?.[1]);
  if (at) return at;

  const team = clean(text.match(new RegExp(`(${NAME}) (?:[Rr]ecruiting )?[Tt]eam\\b`))?.[1]);
  if (team) return team;

  if (sender && sender.includes("@")) {
    const domain = sender.split("@")[1] ?? "";
    if (domain && !FREE_DOMAINS.test(domain)) {
      const label = domain.split(".")[0];
      if (label) return label.charAt(0).toUpperCase() + label.slice(1);
    }
  }
  return null;
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
