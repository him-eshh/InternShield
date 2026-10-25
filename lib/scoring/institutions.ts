// Rules 8-10 helpers (research 01 > section 9): impersonated institutions, visa threats,
// hiring paperwork before an offer, and "reply YES" texts for an interview the user booked.
// Pure text checks. Quotes are always real sentences from the message.
import { firstMatch, snippetAround } from "./backstop";

type OrgKind = "university" | "government" | "immigration";

const IDENTITY =
  String.raw`\b(?:this is|i am|i['’]m|we are|we['’]re|my name is|writing (?:to you )?(?:from|on behalf of)|(?:message|email|notice|notification|letter) from|on behalf of|from the|representing|official)\b(?:(?!\b(?:your|with|via|through|partner\w*|found)\b)[^.!?\n]){0,40}?`;
// The filler can't say "your/with/via/partnering": "we are partnering with your career center" is a company, not a claim.

const ORGS: [OrgKind, string][] = [
  ["immigration", String.raw`(?:uscis|sevp|sevis|citizenship and immigration|homeland security|\bdhs\b|immigration (?:services|office|officer|department|authority)|international student (?:office|services)|designated school official)`],
  ["government", String.raw`(?:department of (?:labor|state|education)|u\.?s\.? (?:department|embassy|government|postal service)|usps|internal revenue|social security administration|federal (?:agency|hiring|government)|government (?:agency|office))`],
  ["university", String.raw`(?:professor|faculty member|career (?:center|services)|financial aid|registrar|student employment|dean['’]?s office|office of (?:career|student|international))`],
];

const ORG_PATTERNS: [OrgKind, RegExp][] = ORGS.map(([k, org]) => [k, new RegExp(`${IDENTITY}\\b${org}`, "gi")]);

/** A "sent via" mail relay: the visible sender name is not the real sender. */
const RELAY = /\bvia\s+(?:sendinblue|brevo|mailchimp|sendgrid|mailgun|constant\s?contact|amazon\s?ses|hubspot|mandrill|gmail|outlook)\b/gi;

/** Does the message say it comes from a university, government, or immigration office? */
export function claimedInstitution(text: string): { kind: OrgKind; quote: string } | null {
  let best: { kind: OrgKind; quote: string; index: number } | null = null;
  for (const [kind, re] of ORG_PATTERNS) {
    const m = firstMatch(text, [re]);
    if (m && (!best || m.index < best.index)) best = { kind, quote: snippetAround(text, m.index, m.index + m.match.length), index: m.index };
  }
  return best && { kind: best.kind, quote: best.quote };
}

export function relayQuote(text: string): string | null {
  const m = firstMatch(text, [RELAY]);
  return m ? snippetAround(text, m.index, m.index + m.match.length) : null;
}

/** .edu / .gov / .mil, their country forms (.edu.au, .ac.uk, .gov.uk), and usps.com. The exact domain, not a look-alike. */
export function isInstitutionDomain(domain: string): boolean {
  return /(?:^|\.)(?:edu|gov|mil)$/.test(domain) || /\.(?:edu|ac|gov)\.[a-z]{2}$/.test(domain) || domain === "usps.com";
}

const THREAT = [
  /\b(?:your|the)\s+(?:f-?1\s+|j-?1\s+|h-?1b\s+|stem\s+)?(?:opt|cpt|visa|sevis|immigration|student|work authori[sz]ation|legal)\s+(?:status|record|authori[sz]ation|permit|visa)?\b[^.!?\n]{0,40}\b(?:will be|has been|is being|may be|could be|is about to be|at risk of being)\s+(?:terminated|revoked|cancell?ed|suspended|invalidated|withdrawn)\b/gi,
  /\b(?:terminate|revoke|cancel|suspend)\w*\s+(?:your\s+)?(?:f-?1\s+|stem\s+)?(?:opt|cpt|visa|sevis|immigration status|student status)\b/gi,
  /\b(?:deport\w*|removal from the (?:u\.?s\.?|united states))\b/gi,
];

/** "Your OPT status will be terminated": an immigration-status threat. */
export function visaThreat(text: string): string | null {
  const m = firstMatch(text, THREAT, true);
  return m ? snippetAround(text, m.index, m.index + m.match.length) : null;
}

/** They want money, said in the message itself. */
const PAY_ASK = [
  /\b(?:you\s+(?:(?:must|need to|have to|should|can|will)\s+)?|please\s+|to\s+|must\s+)(?:pay|send|wire|transfer|remit)\b[^.!?\n]{0,40}(?:\$\s?\d|\b\d[\d,.]*\s?(?:usd|dollars)\b)/gi,
  /\b(?:fine|fee|penalty|payment)s?\s+of\s+\$?\d/gi,
  /\b(?:reinstatement|reactivation|compliance|processing)\s+(?:fee|payment|charge)\b/gi,
];
export function paymentAsk(text: string): string | null {
  const m = firstMatch(text, PAY_ASK, true);
  return m ? snippetAround(text, m.index, m.index + m.match.length) : null;
}

const PAPERWORK = [
  /\b(?:i-?9|e-?verify|w-?4|w-?9)\b/gi,
  /\bdirect[- ]deposit\s+(?:forms?|details|information|authori[sz]ation)\b/gi,
  /\b(?:fill out|complete|submit|send|sign)\b[^.!?\n]{0,30}\bdirect[- ]deposit\b/gi,
  /\bbackground[- ]check\s+(?:forms?|authori[sz]ation|consent)\b/gi,
  /\b(?:voided check|employment eligibility)\b/gi,
];
const FEE = /\b(?:fees?|(?<!in )charges?(?! of)|you\s+(?:(?:must|will|need to|have to)\s+)?pay|pay\s+(?:us|a|the)|payment of)\b/gi;
/** The message itself says an offer was signed or accepted. */
const SIGNED_IN_TEXT = /\b(?:sign(?:ed|ing)|accept(?:ed|ing))\b[^.!?\n]{0,30}\boffer|\boffer\b[^.!?\n]{0,25}\b(?:signed|accepted)\b/i;

/** I-9, W-4, direct deposit forms and the like. `fee` is true when the same sentence asks for a charge. */
export function earlyPaperwork(text: string): { quote: string; fee: boolean } | null {
  if (SIGNED_IN_TEXT.test(text)) return null;
  const m = firstMatch(text, PAPERWORK, true);
  if (!m) return null;
  const quote = snippetAround(text, m.index, m.index + m.match.length);
  return { quote, fee: Boolean(firstMatch(quote, [FEE], true)) };
}

const TIME_WORD =
  /\b(?:\d{1,2}(?::\d{2})?\s?(?:a\.?m\.?|p\.?m\.?)|(?:mon|tues|wednes|thurs|fri|satur|sun)day|tomorrow|today|\d{1,2}\/\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2})\b/i;
/** The text names an interview with a date or time, and says it is scheduled or asks to confirm it. */
export function namesScheduledInterview(text: string): boolean {
  return /\binterview\b/i.test(text) && /\b(?:scheduled|booked|confirm\w*)\b/i.test(text) && TIME_WORD.test(text);
}
