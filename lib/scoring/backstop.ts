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
  | "risky_run" // remote-access tools, terminal pastes, disabling antivirus, installers: critical on their own
  | "money_wrong_way" // the candidate sends money onward, keeps a cut, or pays to withdraw
  | "sensitive_data"
  | "secrecy" // "don't tell your bank", "keep this between us", "don't contact HR"
  | "off_platform"
  | "reply_yes"
  | "no_interview"
  | "pressure";

interface BackstopHit {
  id: BackstopId;
  match: string; // the matched words
  snippet: string; // the sentence around the match, <= 200 chars, real text from the message
}

/** A pattern, optionally with words that must also appear in the same sentence. */
type Pattern = RegExp | { re: RegExp; needs: RegExp };

const CRYPTO = String.raw`(?:usdt|tether|bitcoin|btc|ethereum|eth|crypto(?:currency)?|trc-?20|erc-?20)`;
const YOU_PAY = String.raw`(?:you(?:['’]ll| will)?\s+(?:need to\s+|have to\s+|must\s+)?|must\s+|required to\s+|need to\s+|please\s+)`;
const SENSITIVE_THING = String.raw`(?:ssn|social security(?: number)?|bank account(?: number| details| info(?:rmation)?)?|routing number|online banking|bank login|banking (?:login|credentials|details)|debit card(?: number)?|credit card(?: number)?|driver['’]?s licen[cs]e|passport(?: number| copy| photo)?|(?:photo|government[- ]issued|state) id|password|login credentials)`;
const ASK_VERB = String.raw`(?:send|sending|share|provide|reply|respond|email (?:us|me|it|them)|text (?:us|me|it|them)|submit|upload|give (?:us|me)|forward|enter|verify|asks? for your|asking for your|request your|require your)`;
const YOU_BUY = String.raw`(?:you(?:['’]ll| will)?\s+(?:need to\s+|have to\s+|must\s+)?|must\s+|required to\s+|need to\s+|please\s+|to\s+)`;

// Money flowing the wrong way (research 01 > rule 2).
const P2P = String.raw`(?:zelle|cash\s?app|venmo|paypal|apple\s?(?:cash|pay)|bitcoin|btc|crypto\w*|wire(?:\s+transfer)?|western\s+union|moneygram|gift\s*cards?)`;
const REST = String.raw`(?:rest|remaining|remainder|balance|difference|excess|leftover|extra\s+(?:funds|money|amount))`;
// "we will send the remaining balance via PayPal" is the employer paying you, not the other way round.
const NOT_EMPLOYER_SENDING = String.raw`(?<!\b(?:we|company|employer|payroll|hr)(?:['’]ll)?\s+(?:(?:will|shall|can|would|then|also)\s+)*)`;

// Remote-access tools and ClickFix-style commands (research 01 > rule 3).
const RMM = String.raw`(?:any\s?desk|team\s?viewer|screen\s?connect|connectwise|simple\s?help|atera|splashtop|rust\s?desk|ultra\s?viewer|logmein|ammyy|supremo|remote\s+(?:access|control|desktop|support)\s+(?:tool|software|app|application|client|program))`;
const OFFICIAL_MEETING_HOST = String.raw`(?:[\w-]+\.)?(?:zoom\.us|zoom\.com|microsoft\.com|office\.com|webex\.com|meet\.google\.com|google\.com)`;

const PATTERNS: Record<BackstopId, Pattern[]> = {
  // A check is only critical when the applicant is told to deposit it and spend or send money onward.
  deposit_check: [],
  gift_cards: [
    /\b(?:buy|purchase|send|provide|pay|obtain|pick up)\b[^.!?\n]{0,90}\b(?:gift\s*cards?|e-?gift\s*cards?|itunes\s+cards?|google\s+play\s+cards?|steam\s+cards?|apple\s+cards?)\b/gi,
    /\b(?:gift\s*cards?|e-?gift\s*cards?)\b[^.!?\n]{0,70}\b(?:send|share|email|text)\b[^.!?\n]{0,40}\b(?:codes?|pins?|photos?)\b/gi,
  ],
  crypto_or_task_deposit: [
    // You pay in: "you need to top up your account with 50 USDT", "Deposit $100 in bitcoin to start".
    new RegExp(String.raw`(?:(?<=(?:^|[.!?\n:])\s{0,3})|\b${YOU_PAY})(?:deposit|send|transfer|top[- ]?up|recharge|fund|buy|purchase)\w*\s+(?:[\w'’]+\s+){0,5}?(?:\$?\d[\d,.]*\s*)?(?:in\s+|of\s+|worth of\s+)?${CRYPTO}\b`, "gi"),
    // A crypto amount alone can be legitimate pay; the applicant must be asked to put money in.
    new RegExp(String.raw`\b(?:you(?:\s+(?:must|need to|have to|will))?|please|required to)\b[^.!?\n]{0,70}\b(?:deposit|send|transfer|top[- ]?up|recharge|fund|buy|purchase)\b[^.!?\n]{0,70}\b${CRYPTO}\b`, "gi"),
    new RegExp(String.raw`\b(?:and|then|please|you(?:\s+(?:must|need to|have to|will))?)\s+(?:deposit|top[- ]?up|recharge|fund|send)\b[^.!?\n]{0,55}\b${CRYPTO}\b[^.!?\n]{0,70}\b(?:unlock|start|begin|withdraw|tasks?|earnings|commissions?)\b`, "gi"),
    /\b(?:you(?:\s+(?:must|need to|have to))?|please|if your balance[^.!?\n]{0,35})\b[^.!?\n]{0,70}\b(?:recharge|top[- ]?up)\b[^.!?\n]{0,40}\b(?:your\s+)?(?:account|balance|tasks?)\b/gi,
  ],
  pay_fee: [
    // A directed payment with letter-spaced scam vocabulary, not a bare mention of a fee.
    /\b(?:you\s+(?:need|have)\s+to\s+|please\s+|must\s+)p\s+a\s+y\b[^.!?\n]{0,55}\br\s+e\s+g\s+i\s+s\s+t\s+r\s+a\s+t\s+i\s+o\s+n\s+f\s+e\s+e\b/gi,
    // cleanText can join the article and adjacent word in a spaced phrase.
    /\b(?:you\s+(?:need|have)\s+to\s+|please\s+|must\s+)paya?\b[^.!?\n]{0,55}\bregistrationfee\b/gi,
    /\b(?:registration|application|training|onboarding|processing|certification|background[- ]check|enrollment|enrolment|placement|activation|membership|administrative|admin|refundable|equipment)\s+(?:fee|fees|charge)\b/gi,
    new RegExp(String.raw`\b${YOU_BUY}pay\b[^.!?\n]{0,40}\bfees?\b`, "gi"),
    /\b(?:one[- ]time|small|refundable|upfront|up-front)\s+(?:fee|deposit)\b/gi,
    /\bfees?\b[^.!?\n]{0,30}\b(?:to (?:start|begin|get started|secure|reserve|process)|before (?:you )?start)/gi,
    /\bto (?:reserve|secure|hold|keep) your (?:internship |job )?(?:place|spot|seat|slot|position)\b[^.!?\n]{0,40}\b(?:pay|send|deposit)\b/gi,
  ],
  buy_equipment: [
    // "Your first task is to research and purchase some office supplies" (the fake-professor check scam).
    new RegExp(String.raw`(?:(?<=(?:^|[.!?\n:])\s{0,3})|\b${YOU_BUY})(?:\w+\s+and\s+)?(?:buy|purchase|order|pay for)\b[^.!?\n]{0,50}\b(?:equipment|laptop|computer|software|supplies|devices?|macbook|ipad|iphone|printer|starter kit|training (?:materials|kit|course))\b`, "gi"),
  ],
  reship_or_forward: [
    /\b(?:you(?:\s+(?:will|must|need to|have to))?|your\s+(?:job|role|task|duties)|please|we\s+(?:need|want|ask)\s+you\s+to)\b[^.!?\n]{0,90}\bre-?ship(?:ping|ped|per|pers|ment)?\b/gi,
    /\b(?:receive|accept|collect)\w*\b[^.!?\n]{0,50}\b(?:packages?|parcels?|shipments?)\b[^.!?\n]{0,60}\b(?:forward|re-?label|repackag|ship (?:them|it)|send (?:them|it))\w*/gi,
    /\bforward(?:ing|ed)?\s+(?:the\s+|these\s+|those\s+|any\s+|all\s+)?(?:packages?|parcels?|shipments?|items|funds|money|payments?\s+to)\b/gi,
    /\b(?:package|parcel)\s+(?:inspectors?|forwarders?|processing (?:agents?|assistants?))\b[^.!?\n]{0,90}\b(?:receive|forward|ship|repackag|re-?label)\w*\b/gi,
    /\b(?:receive|process|accept)\w*\b[^.!?\n]{0,30}\b(?:payments?|funds|transfers?|money)\b[^.!?\n]{0,50}\b(?:on (?:our|the company['’]?s) behalf|forward (?:it|them|the funds)|transfer (?:it|them)|send (?:it|them))\b/gi,
  ],
  run_code_or_install: [
    /\bnpm\s+(?:install|i|run|start)\b/gi,
    /\byarn\s+(?:install|start|dev)\b/gi,
    /\bpip\s+install\b/gi,
    /\bgit\s+clone\b/gi,
    /\bclone\s+(?:this|the|our|my)\s+(?:repo|repository|project|codebase)\b/gi,
    /\b(?:install|download|run|execute)\b[^.!?\n]{0,40}(?:\b(?:drivers?(?!['’])|script|npm package|browser extension|this file|the attached (?:file|project|zip)|zip file|the project locally)\b|\.(?:exe|dmg|msi|bat)\b)/gi,
    /\b(?:disable|turn off|deactivate)\b[^.!?\n]{0,30}\b(?:antivirus|sandbox|docker|defender|firewall|security software)\b/gi,
    /\brun this\s+(?:command|code|script|file|program)\b/gi,
  ],
  risky_run: [
    // Remote-access tools, in the same sentence as an install/run/share cue.
    new RegExp(String.raw`\b(?:install|download|run|open|launch|use|start|share|give)\w*\b[^.!?\n]{0,60}\b${RMM}\b`, "gi"),
    new RegExp(String.raw`\b${RMM}\b[^.!?\n]{0,50}\b(?:install\w*|download\w*|link|session|access code|your (?:id|screen|computer|pc|laptop))\b`, "gi"),
    // "Update Zoom/Teams" with a link to somewhere that isn't the real site, an installer, or a "fix".
    new RegExp(
      String.raw`\b(?:update|upgrade|install|download|fix)\w*\b[^.!?\n]{0,30}\b(?:zoom|(?:microsoft\s+|ms\s+)?teams|webex|google\s+meet)\b[^.!?\n]{0,60}(?:https?:\/\/(?!${OFFICIAL_MEETING_HOST}(?:[\/\s]|$))|\.(?:exe|dmg|msi|pkg)\b|\b(?:plugin|patch|outdated|error|fix)\b)`,
      "gi",
    ),
    // Terminal pastes ("fix your camera driver" and similar).
    /\b(?:paste|copy|enter|type)\b[^.!?\n]{0,40}\b(?:command|line|script|snippet|code)\b[^.!?\n]{0,40}\b(?:into|in|to|on)\s+(?:the\s+|your\s+|a\s+)?(?:terminal|powershell|command\s+prompt|cmd|shell|run\s+dialog)\b/gi,
    /\b(?:curl|wget)\b[^\n]{0,150}\|\s*(?:sudo\s+)?(?:ba|z)?sh\b/gi,
    /\b(?:iwr|invoke-webrequest|irm|invoke-restmethod)\b[^\n]{0,150}\|\s*iex\b/gi,
    /\bpowershell\b[^\n]{0,40}\s-(?:enc|encodedcommand|e|w\s+hidden)\b/gi,
    /\bwin(?:dows)?\s?(?:key\s?)?\+\s?r\b/gi,
    /\b(?:fix|resolve|repair|update|install)\w*\b[^.!?\n]{0,30}\b(?:camera|microphone|webcam|mic|audio)\b[^.!?\n]{0,20}\b(?:driver|error|issue|problem)s?\b[^.!?\n]{0,80}\b(?:command|terminal|script|run\w*|paste|copy|download\w*|install\w*|link)\b/gi,
    // Switching off protection, and installers.
    /\b(?:disable|turn off|deactivate)\b[^.!?\n]{0,30}\b(?:antivirus|anti-virus|virus protection|sandbox|defender|firewall|security software|windows security)\b/gi,
    /\b(?:install|download|run|execute)\w*\b[^.!?\n]{0,40}(?:\b(?:drivers?(?!['’])|browser extension|chrome extension)\b|\.(?:exe|dmg|msi|bat|pkg)\b)/gi,
  ],
  money_wrong_way: [
    // "send the remaining balance to our supplier via Zelle"
    new RegExp(String.raw`${NOT_EMPLOYER_SENDING}\b(?:send|transfer|wire|forward|return|remit)\w*\b[^.!?\n]{0,100}?\b${REST}\b[^.!?\n]{0,100}?\b${P2P}\b`, "gi"),
    new RegExp(String.raw`\b(?:zelle|venmo|cash\s?app|cashapp|wire)\s+(?:us\s+|them\s+|the\s+)?${REST}\b`, "gi"),
    // Mobile deposits and e-checks, only with money going back out (a bare "mobile deposit" is normal banking).
    new RegExp(String.raw`\b(?:mobile[- ](?:check[- ])?deposit|e-?checks?)\b[^.!?\n]{0,100}\b(?:send|buy|purchase|transfer|wire|forward|${P2P}|vendor|supplier|${REST})\b`, "gi"),
    // Money mule setups
    /\buse\s+your\s+(?:own\s+|personal\s+)?(?:bank|checking|savings)\s+account\b(?![^.!?\n]{0,60}\b(?:direct deposit|payroll|paycheck|portal|workday|set up)\b)/gi,
    /\buse\s+your\s+(?:own\s+|personal\s+)account\b[^.!?\n]{0,60}\b(?:receive|transfer|forward|send|move|payments?|funds|money)\b/gi,
    /\bopen\s+a\s+(?:new\s+)?(?:bank|checking|savings)\s+account\b[^.!?\n]{0,60}\b(?:receive|process|transfer|forward|company|payments?)\b/gi,
    /\b(?:become|work as|act as|serve as|hiring)\s+(?:a\s+|an\s+|our\s+)?(?:payment|rebate|funds)\s+(?:processor|agent|handler)\b/gi,
    /\bkeep\s+(?:\$\s?\d[\d,.]*|\d{1,2}\s?%)\s+(?:of\s+\w+\s+)?(?:for|as)\b/gi,
    // Task scams: pay to withdraw, negative balances, "combo" orders
    /\b(?:tax(?:es)?|fees?|charges?)\b[^.!?\n]{0,30}\b(?:to|before)\s+(?:you\s+(?:can\s+)?)?(?:withdraw|cash\s?out)/gi,
    /\bnegative\s+(?:balance|account|amount)\b/gi,
    /\b(?:combo|merged?)\s+(?:order|task)s?\b/gi,
    /\breset\s+(?:your\s+)?tasks?\b/gi,
  ],
  sensitive_data: [new RegExp(String.raw`\b${ASK_VERB}\b[^.!?\n]{0,50}?\b${SENSITIVE_THING}\b`, "gi")],
  secrecy: [
    /\b(?:do not|don['’]?t|never|must not|should not|shouldn['’]?t)\s+(?:tell|inform|notify|mention\s+(?:this\s+)?to|speak\s+(?:to|with)|talk\s+(?:to|with)|let)\s+(?:\w+\s+){0,3}?(?:bank|banker|family|parents?|friends?|anyone|anybody|school|university|advisor|adviser|career (?:center|services)|dean)\b/gi,
    /\bkeep\s+(?:this|it|everything|these details)\s+(?:strictly\s+|completely\s+|totally\s+)?(?:confidential|secret|private|quiet)\s+from\b/gi,
    /\bkeep\s+(?:this|it)\s+(?:a\s+)?secret\b|\bkeep\s+(?:this|it)\s+between\s+us\b|\bbetween\s+us\s+(?:only|for now)\b/gi,
    /\b(?:do not|don['’]?t|never)\s+(?:contact|call|email|reach out to|check with|verify with)\s+(?:\w+\s+){0,2}?(?:hr|human resources|the company|your school|your university|career (?:center|services)|your bank)\b/gi,
    /\bif\s+(?:the\s+|your\s+)?(?:bank|teller|anyone)\s+asks\b[^.!?\n]{0,30}\b(?:say|tell|just say)\b/gi,
  ],
  off_platform: [
    /\b(?:whatsapp|whats app|telegram|wechat|viber|google hangouts|wickr|threema)\b/gi,
    /\b(?:on|via|over|through|download|use)\s+signal\b(?!\s+processing)/gi,
    /\bsignal\s+(?:app|messenger)\b/gi,
    /\b(?:chat|text)[- ](?:based|only)\s+interview\b/gi,
    /\binterview\b[^.!?\n]{0,30}\b(?:via|over|through|on)\s+(?:chat|text|instant messag\w*)\b/gi,
    // "Text Professor X at (774) 555-0199 with your full name ..." applies by text to a personal number.
    { re: /\btext\s+(?:me|us|professor|prof\.?|dr\.?|mr\.?|mrs\.?|ms\.?)\b[^.!?\n]{0,30}?\b(?:at|on)\s+\(?\+?\d/gi, needs: /\bwith\s+your\s+(?:full\s+)?(?:name|details|info)/i },
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
/** Describing a known scam is not asking the applicant to do it. */
const SCAM_DESCRIPTION = /\b(?:scammers?|fraudsters?|a scam|fraud warning)\b[^.!?\n]{0,90}\b(?:may|might|often|typically|could|ask|tell)\b/i;
/** The employer pays: "we'll pay for your laptop", "we reimburse certification fees". Fees and equipment only. */
const EMPLOYER_PAYS =
  /\b(?:we|the company|our company|the employer)(?:['’](?:ll|d|re))?\s+(?:\w+\s+){0,3}?(?:pay|cover|reimburse|provide|waive|order|buy|purchase|supply)\w*\b|\b(?:reimburs\w*|waived?|free of charge|at no cost|company[- ](?:paid|provided))\b/i;
/**
 * Equipment only: the employer ships or provides it, or it's free. "We'll reimburse you" does NOT count,
 * because buy-first-and-get-repaid is the classic fake-equipment scam (research 01 > rule 1).
 */
const EQUIPMENT_PROVIDED =
  /\b(?:we|the company|our company|the employer)(?:['’](?:ll|d|re))?\s+(?:\w+\s+){0,3}?(?:ship|provide|supply|issue|cover|pay for)\w*\b|\b(?:waived?|free of charge|at no cost|company[- ](?:paid|provided|issued))\b/i;
const PROVIDER_IDS = new Set<BackstopId>(["pay_fee", "buy_equipment"]);
const STRICT_PROVIDER_IDS = new Set<BackstopId>(["buy_equipment"]);

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
function negated(text: string, index: number, end: number, employerPays: boolean, strict: boolean): boolean {
  const [s, e] = sentenceBounds(text, index, end);
  const before = text.slice(s, index);
  if (DIRECT_NEGATION.test(before) || WARNING_LEAD.test(before) || SCAM_DESCRIPTION.test(before)) return true;
  if (!employerPays) return false;
  if (strict) return EQUIPMENT_PROVIDED.test(before) || /\b(?:waived?|covered by us|at no cost|free of charge)\b/i.test(text.slice(index, e));
  return EMPLOYER_PAYS.test(before) || /\b(?:reimburs\w*|waived?|covered by us)\b/i.test(text.slice(index, e));
}

/** A fake-check flow needs all three steps, not a check amount or deposit mentioned on its own. */
function checkFlow(text: string): { index: number; match: string } | null {
  const checks = /\b(?:check|cheque)\b/gi;
  let check: RegExpExecArray | null;
  while ((check = checks.exec(text)) !== null) {
    const windowStart = Math.max(0, check.index - 80);
    const window = text.slice(windowStart, Math.min(text.length, check.index + 320));
    const deposit = /\b(?:deposit|cash)\s+(?:(?:the|this|a|your|that|an)\s+)?(?:(?:cashier['’]?s|certified|company|business)\s+)?(?:check|cheque|it)\b/i.exec(window);
    if (!deposit) continue;
    const depositAt = windowStart + deposit.index;
    const depositEnd = depositAt + deposit[0].length;
    if (negated(text, depositAt, depositEnd, false, false)) continue;
    const [sentenceStart] = sentenceBounds(text, depositAt, depositEnd);
    if (/\b(?:we|the company|payroll)\s+(?:will\s+)?$/.test(text.slice(sentenceStart, depositAt).toLowerCase())) continue;

    const onward = /\b(?:send|transfer|wire|forward|buy|purchase|pay)\b[^.!?\n]{0,90}\b(?:remaining|rest|balance|difference|money|funds|vendor|supplier|equipment|laptop|computer|supplies|gift\s*cards?|\$\s?\d)\b/i.exec(window.slice(deposit.index + deposit[0].length));
    if (!onward) continue;
    const onwardAt = depositEnd + onward.index;
    if (negated(text, onwardAt, onwardAt + onward[0].length, false, false)) continue;
    const [onwardSentence] = sentenceBounds(text, onwardAt, onwardAt + onward[0].length);
    if (/\b(?:we|the company|payroll)\s+(?:will\s+)?$/.test(text.slice(onwardSentence, onwardAt).toLowerCase())) continue;
    return { index: depositAt, match: text.slice(depositAt, onwardAt + onward[0].length) };
  }
  return null;
}

/** First match of any pattern that isn't negated and meets its same-sentence needs, or null. */
export function firstMatch(
  text: string,
  patterns: Pattern[],
  negatable = false,
  employerPays = false,
  strictProvider = false,
): { index: number; match: string } | null {
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
      if (negatable && negated(text, m.index, end, employerPays, strictProvider)) continue;
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
    const m = id === "deposit_check"
      ? checkFlow(text)
      : firstMatch(text, PATTERNS[id], true, PROVIDER_IDS.has(id), STRICT_PROVIDER_IDS.has(id));
    if (m) hits.push({ id, match: m.match, snippet: snippetAround(text, m.index, m.index + m.match.length) });
  }
  return hits;
}
