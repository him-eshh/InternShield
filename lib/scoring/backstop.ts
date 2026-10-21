// Keyword/regex scan of the raw message (spec.md > Scoring Engine > backstop.ts).
// Runs even when extraction failed, so a message that fools the AI can't hide a critical flag.
import { MAX_QUOTE_CHARS } from "../quotes";

export type BackstopId =
  | "pay_fee"
  | "buy_equipment"
  | "deposit_check"
  | "gift_cards"
  | "crypto_or_task_deposit"
  | "reship_or_forward"
  | "run_code_or_install"
  | "sensitive_data"
  | "off_platform"
  | "reply_yes"
  | "no_interview"
  | "pressure";

export interface BackstopHit {
  id: BackstopId;
  match: string; // the matched words
  snippet: string; // the sentence around the match, <= 200 chars, real text from the message
}

/** A pattern, optionally with words that must also appear in the same sentence. */
export type Pattern = RegExp | { re: RegExp; needs: RegExp };

const MONEY_WORDS = /\$|\b(?:check|cheque|funds|money|balance|dollars|payment|zelle|venmo|cash ?app|wire|paypal)\b/i;
const CRYPTO = String.raw`(?:usdt|tether|bitcoin|btc|ethereum|eth|crypto(?:currency)?|trc-?20|erc-?20)`;
const CRYPTO_UNIT = String.raw`(?:usdt|tether|bitcoin|btc|ethereum|eth)`;
const YOU_PAY = String.raw`(?:you(?:['’]ll| will)?\s+(?:need to\s+|have to\s+|must\s+)?|must\s+|required to\s+|need to\s+|please\s+)`;
const SENSITIVE_THING = String.raw`(?:ssn|social security(?: number)?|bank account(?: number| details| info(?:rmation)?)?|routing number|online banking|bank login|banking (?:login|credentials|details)|debit card(?: number)?|credit card(?: number)?|driver['’]?s licen[cs]e|passport(?: number| copy| photo)?|(?:photo|government[- ]issued|state) id|password|login credentials)`;
const ASK_VERB = String.raw`(?:send|sending|share|provide|reply|respond|email (?:us|me|it|them)|text (?:us|me|it|them)|submit|upload|give (?:us|me)|forward|enter|verify|ask for your|request your|require your)`;
const YOU_BUY = String.raw`(?:you(?:['’]ll| will)?\s+(?:need to\s+|have to\s+|must\s+)?|must\s+|required to\s+|need to\s+|please\s+|to\s+)`;

const PATTERNS: Record<BackstopId, Pattern[]> = {
  deposit_check: [
    /\b(?:mail|send|sending|mailing|issue|issuing|courier|ship|overnight)\s+(?:you\s+)?(?:a|the|an)\s+(?:cashier['’]?s\s+|certified\s+|company\s+|business\s+)?(?:check|cheque)\b/gi,
    /\b(?:deposit|cash|mobile[- ]deposit)\s+(?:the|this|a|your|that)\s+(?:\w+\s+)?(?:check|cheque)\b/gi,
    /\b(?:check|cheque)\s+(?:for|of|worth|in the amount of)\s+\$?\d/gi,
    /\bcashier['’]?s\s+(?:check|cheque)\b/gi,
    { re: /\bsend\s+(?:back\s+)?(?:the\s+)?(?:remaining|rest|balance|difference|excess|leftover)\b/gi, needs: MONEY_WORDS },
  ],
  gift_cards: [
    /\b(?:gift\s*cards?|e-?gift\s*cards?|itunes\s+cards?|google\s+play\s+cards?|steam\s+cards?|apple\s+cards?)\b/gi,
  ],
  crypto_or_task_deposit: [
    // You pay in: "you need to top up your account with 50 USDT", "Deposit $100 in bitcoin to start".
    new RegExp(String.raw`(?:(?<=(?:^|[.!?\n:])\s{0,3})|\b${YOU_PAY})(?:deposit|send|transfer|top[- ]?up|recharge|fund|buy|purchase)\w*\s+(?:[\w'’]+\s+){0,5}?(?:\$?\d[\d,.]*\s*)?(?:in\s+|of\s+|worth of\s+)?${CRYPTO}\b`, "gi"),
    // An amount: "50 USDT", "$200 in bitcoin".
    new RegExp(String.raw`(?:\$\d[\d,.]*\s+(?:in|of|worth of)\s+${CRYPTO}|\b\d[\d,.]*\s*${CRYPTO_UNIT})\b`, "gi"),
    new RegExp(String.raw`\b${CRYPTO}\s+deposits?\b`, "gi"),
    /\bunlock\w*\b[^.!?\n]{0,60}\b(?:earnings|commissions?|withdraw\w*|salary|payouts?|wages)\b/gi,
    /\b(?:recharge|top[- ]?up)\b[^.!?\n]{0,40}\b(?:account|balance|tasks?)\b/gi,
  ],
  pay_fee: [
    /\b(?:registration|application|training|onboarding|processing|certification|background[- ]check|enrollment|enrolment|placement|activation|membership|administrative|admin|refundable|equipment)\s+(?:fee|fees|charge)\b/gi,
    new RegExp(String.raw`\b${YOU_BUY}pay\b[^.!?\n]{0,40}\bfees?\b`, "gi"),
    /\b(?:one[- ]time|small|refundable|upfront|up-front)\s+(?:fee|deposit)\b/gi,
    /\bfees?\b[^.!?\n]{0,30}\b(?:to (?:start|begin|get started|secure|reserve|process)|before (?:you )?start)/gi,
  ],
  buy_equipment: [
    new RegExp(String.raw`(?:(?<=(?:^|[.!?\n:])\s{0,3})|\b${YOU_BUY})(?:buy|purchase|order|pay for)\b[^.!?\n]{0,50}\b(?:equipment|laptop|computer|software|supplies|devices?|macbook|ipad|iphone|printer|starter kit|training (?:materials|kit|course))\b`, "gi"),
    /\b(?:approved|designated|preferred|certified)\s+vendor\b/gi,
  ],
  reship_or_forward: [
    /\bre-?ship(?:ping|ped|per|pers|ment)?\b/gi,
    /\b(?:receive|accept|collect)\w*\b[^.!?\n]{0,50}\b(?:packages?|parcels?|shipments?)\b[^.!?\n]{0,60}\b(?:forward|re-?label|repackag|ship (?:them|it)|send (?:them|it))\w*/gi,
    /\bforward(?:ing|ed)?\s+(?:the\s+|these\s+|those\s+|any\s+|all\s+)?(?:packages?|parcels?|shipments?|items|funds|money|payments?\s+to)\b/gi,
    /\b(?:package|parcel)\s+(?:inspectors?|forwarders?|processing (?:agents?|assistants?))\b/gi,
    /\b(?:receive|process|accept)\w*\b[^.!?\n]{0,30}\b(?:payments?|funds|transfers?|money)\b[^.!?\n]{0,50}\b(?:on (?:our|the company['’]?s) behalf|forward (?:it|them|the funds)|transfer (?:it|them)|send (?:it|them))\b/gi,
  ],
  run_code_or_install: [
    /\bnpm\s+(?:install|i|run|start)\b/gi,
    /\byarn\s+(?:install|start|dev)\b/gi,
    /\bpip\s+install\b/gi,
    /\bgit\s+clone\b/gi,
    /\bclone\s+(?:this|the|our|my)\s+(?:repo|repository|project|codebase)\b/gi,
    /\b(?:install|download|run|execute)\b[^.!?\n]{0,40}\b(?:drivers?|\.exe|\.dmg|\.msi|\.bat|script|npm package|browser extension|this file|the attached (?:file|project|zip)|zip file|the project locally)\b/gi,
    /\b(?:disable|turn off|deactivate)\b[^.!?\n]{0,30}\b(?:antivirus|sandbox|docker|defender|firewall|security software)\b/gi,
    /\brun this\s+(?:command|code|script|file|program)\b/gi,
  ],
  sensitive_data: [new RegExp(String.raw`\b${ASK_VERB}\b[^.!?\n]{0,50}?\b${SENSITIVE_THING}\b`, "gi")],
  off_platform: [
    /\b(?:whatsapp|whats app|telegram|wechat|viber|google hangouts|wickr|threema)\b/gi,
    /\b(?:on|via|over|through|download|use)\s+signal\b(?!\s+processing)/gi,
    /\bsignal\s+(?:app|messenger)\b/gi,
    /\b(?:chat|text)[- ](?:based|only)\s+interview\b/gi,
    /\binterview\b[^.!?\n]{0,30}\b(?:via|over|through|on)\s+(?:chat|text|instant messag\w*)\b/gi,
  ],
  reply_yes: [/\b(?:reply|respond|text|answer)\s+(?:back\s+)?(?:with\s+)?["'“”‘’]?(?:yes|y)["'“”‘’]?(?=[\s.,!)]|$)/gi],
  no_interview: [
    /\bhired\s+(?:directly|immediately|on the spot|right away|without)\b/gi,
    /\b(?:without|no)\s+(?:an?\s+|any\s+)?(?:formal\s+)?interviews?\b(?!\s*(?:fee|cost|charge))/gi,
    /\b(?:skip|bypass)\s+(?:the\s+)?interview/gi,
  ],
  pressure: [
    /\b(?:within|in|next)\s+(?:the\s+next\s+)?\d{1,2}\s*(?:hours?|hrs?)\b(?!\s+(?:(?:a|per|each|every)\s+(?:week|day|month|shift)|daily|weekly))/gi,
    /\b(?:act|respond|reply)\s+(?:now|fast|quickly|immediately|today)\b/gi,
    /\blimited\s+(?:spots?|slots?|positions?|openings?|time)\b/gi,
    /\b(?:offer|position|opportunity|slot)\s+(?:is\s+)?(?:only\s+)?(?:available|valid|open)\s+(?:for|until)\s+(?:the\s+next|today|tonight|\d)/gi,
    /\burgent(?:ly)?\b(?!\s+care)/gi,
    /\bwill be (?:given|offered) to (?:another|someone else|the next)/gi,
    /\bfirst come,? first serve/gi,
  ],
};

/** A negation right before the match: "no application fee", "never share your SSN". At most 2 words between. */
const DIRECT_NEGATION =
  /\b(?:no|never|not|without|don['’]?t|do not|won['’]?t|will not|doesn['’]?t|does not|didn['’]?t|cannot|can['’]?t|zero)\s+(?:[\w'’-]+\s+){0,2}$/i;
/** A fraud-warning lead earlier in the same sentence: "we will never ask you to buy gift cards, deposit a check, or ...". */
const WARNING_LEAD =
  /\b(?:never|not|don['’]?t|do not|won['’]?t|will not|doesn['’]?t|does not)\s+(?:\w+\s+){0,2}(?:ask|request|require|charge|expect|tell)\w*\b/i;
/** The employer pays: "we'll pay for your laptop", "we reimburse certification fees". Fees and equipment only. */
const EMPLOYER_PAYS =
  /\b(?:we|the company|our company|the employer)(?:['’](?:ll|d|re))?\s+(?:\w+\s+){0,3}?(?:pay|cover|reimburse|provide|waive|order|buy|purchase|supply)\w*\b|\b(?:reimburs\w*|waived?|free of charge|at no cost|company[- ](?:paid|provided))\b/i;
const PROVIDER_IDS = new Set<BackstopId>(["pay_fee", "buy_equipment"]);

const BOUNDARY = /[.!?\n]/;
const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

function sentenceBounds(text: string, start: number, end: number): [number, number] {
  let s = start;
  while (s > 0 && !BOUNDARY.test(text[s - 1])) s--;
  let e = end;
  while (e < text.length && !BOUNDARY.test(text[e])) e++;
  if (e < text.length && text[e] !== "\n") e++;
  return [s, e];
}

/** The sentence around [start, end), trimmed to MAX_QUOTE_CHARS. Always real message text. */
export function snippetAround(text: string, start: number, end: number): string {
  const [s, e] = sentenceBounds(text, start, end);
  let out = collapse(text.slice(s, e));
  if (out.length > MAX_QUOTE_CHARS) {
    const pad = Math.max(0, Math.floor((MAX_QUOTE_CHARS - (end - start)) / 2));
    const ws = Math.max(s, start - pad);
    out = collapse(text.slice(ws, Math.min(e, ws + MAX_QUOTE_CHARS)));
  }
  return out.slice(0, MAX_QUOTE_CHARS).trim();
}

/** Is this match switched off by a negation, a fraud-warning footer, or (fees/equipment) the employer paying? */
function negated(text: string, index: number, end: number, employerPays: boolean): boolean {
  const [s, e] = sentenceBounds(text, index, end);
  const before = text.slice(s, index);
  if (DIRECT_NEGATION.test(before) || WARNING_LEAD.test(before)) return true;
  return employerPays && (EMPLOYER_PAYS.test(before) || /\b(?:reimburs\w*|waived?|covered by us)\b/i.test(text.slice(index, e)));
}

/** First match of any pattern that isn't negated and meets its same-sentence needs, or null. */
export function firstMatch(text: string, patterns: Pattern[], negatable = false, employerPays = false): { index: number; match: string } | null {
  for (const p of patterns) {
    const source = p instanceof RegExp ? p : p.re;
    const needs = p instanceof RegExp ? null : p.needs;
    const re = new RegExp(source.source, source.flags.includes("g") ? source.flags : source.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      const end = m.index + m[0].length;
      if (negatable && negated(text, m.index, end, employerPays)) continue;
      if (needs) {
        const [s, e] = sentenceBounds(text, m.index, end);
        if (!needs.test(text.slice(s, e))) continue;
      }
      return { index: m.index, match: m[0] };
    }
  }
  return null;
}

export function backstop(text: string): BackstopHit[] {
  const hits: BackstopHit[] = [];
  for (const id of Object.keys(PATTERNS) as BackstopId[]) {
    const m = firstMatch(text, PATTERNS[id], true, PROVIDER_IDS.has(id));
    if (m) hits.push({ id, match: m.match, snippet: snippetAround(text, m.index, m.index + m.match.length) });
  }
  return hits;
}
