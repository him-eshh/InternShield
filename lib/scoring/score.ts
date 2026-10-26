// The scoring engine (spec.md > Scoring Engine). Pure: no network, env, or React.
// AI facts and the raw-text backstop are combined; fixed rules decide the score.
import type { AskedTo, AskKind, Facts, Flag, FlagGroup, LinkIssue, Quoted, Report, RiskLevel, ScoreInput } from "../types";
import { quoteIsReal, visibleQuote } from "../quotes";
import { backstop, snippetAround, type BackstopId } from "./backstop";
import { buildCoverage } from "./coverage";
import { emailDomain, isFreeEmail, isHiringPlatform, lookalike, registrableDomain, type LookalikeKind } from "./domains";
import { withFlagInfo } from "./flagInfo";
import { roleAboveLevel } from "./level";
import { matchFieldPattern, taskVocab } from "./patterns";
import { matchRows, payMatch, rolesMatch } from "./posting";
import { pickQuestions, questionGaps, questionHint, type Relevance } from "./questions";
import { BANNED_WORDS, CHANGE_REASONS, WEIGHTS as W } from "./rules";
import { cleanText } from "./unicode";
import { checkLinks } from "./links";
import { claimedInstitution, earlyPaperwork, isInstitutionDomain, namesScheduledInterview, paymentAsk, relayQuote, visaThreat } from "./institutions";

const DAY_MS = 86_400_000;
const FTC_JOB_SCAMS = "https://consumer.ftc.gov/articles/job-scams";
const FTC_FAKE_CHECKS = "https://consumer.ftc.gov/articles/how-spot-avoid-and-report-fake-check-scams";

type CriticalAsk = Exclude<AskKind, "sensitive_data" | "reply_yes" | "other">;

const CRITICAL_COPY: Record<CriticalAsk, { title: string; why: string; sourceUrl?: string }> = {
  pay_fee: {
    title: "They want you to pay a fee",
    why: "Real employers never charge you to get a job or start working.",
    sourceUrl: FTC_JOB_SCAMS,
  },
  buy_equipment: {
    title: "They want you to buy equipment or a kit",
    why: "Real employers provide equipment or pay for it directly. Buying it through their vendor is a common scam.",
    sourceUrl: FTC_JOB_SCAMS,
  },
  deposit_check: {
    title: "They want you to deposit a check and forward the money",
    why: "This is the fake-check scam: the check bounces days later and you owe the bank everything you sent.",
    sourceUrl: FTC_FAKE_CHECKS,
  },
  gift_cards: {
    title: "They ask you to buy or send gift cards",
    why: "No real employer pays you, or asks you to pay, with gift cards.",
    sourceUrl: FTC_JOB_SCAMS,
  },
  crypto_or_task_deposit: {
    title: "They ask for crypto or a deposit to unlock earnings",
    why: "Paying in to unlock tasks or earnings is a known task scam. The money doesn't come back.",
    sourceUrl: FTC_JOB_SCAMS,
  },
  reship_or_forward: {
    title: "They want you to reship packages or forward money",
    why: "Reshipping and money-forwarding jobs use you to move stolen goods or money, and you can be held responsible.",
    sourceUrl: FTC_JOB_SCAMS,
  },
  run_code_or_install: {
    title: "They want you to run their code or install something",
    why: "Fake coding tests, remote-access tools, and \"driver fixes\" from recruiters are used to put malware on your computer or take it over.",
  },
  money_wrong_way: {
    title: "They want you to send money back out",
    why: "Real employers don't ask you to pass money on, keep a cut, use your own account, or pay a fee to withdraw. That is how scammers move money through you.",
    sourceUrl: "https://www.fdicoig.gov/alerts/public-service-alert-money-mules",
  },
};
// run_code_or_install and money_wrong_way have their own rules below.
const CRITICAL_ASKS = (Object.keys(CRITICAL_COPY) as CriticalAsk[]).filter((k) => k !== "run_code_or_install" && k !== "money_wrong_way");
// AI labels are untrusted. A real quote alone does not prove the quoted words
// describe this action; the raw-text detector must independently find it.
const ACTION_BACKSTOP_REQUIRED = new Set<CriticalAsk>(["pay_fee", "buy_equipment", "deposit_check", "gift_cards", "crypto_or_task_deposit", "reship_or_forward"]);
const TOLD_ASKS: [AskedTo, CriticalAsk][] = [
  ["pay", "pay_fee"],
  ["deposit_check", "deposit_check"],
  ["crypto", "crypto_or_task_deposit"],
  ["run_file", "run_code_or_install"],
];
const MONEY_FAMILY =["deposit_check", "crypto_or_task_deposit", "reship_or_forward"];

const CRYPTO_THEME =
  /\b(?:crypto(?:currency)?|blockchain|web3|dapps?|nfts?|defi|smart contracts?|solidity|metamask|binance|usdt|bitcoin|ethereum)\b/i;
/** The recruiter found you; you didn't apply. "reviewed your resume" is deliberately not here. */
const UNSOLICITED =
  /\b(?:came across|found|saw|noticed|stumbled (?:up)?on|impressed by|loved)\s+(?:your|you on)\b[^.!?\n]{0,30}\b(?:profile|github|gitlab|r[eé]sum[eé]|portfolio|linkedin|repos?|projects?|work)\b/i;

const STARTUP_WORDS =
  /\b(?:start-?up|small business|small team|small company|early[- ]stage|pre-seed|seed[- ]stage|family[- ]owned|stealth|just launched|co-?founder|founder)\b/i;
/** You applied: they say so. Then "Did you apply first?" isn't worth asking. */
const APPLIED_TEXT = /\b(?:thank(?:s| you) for (?:applying|your (?:application|interest))|your (?:recent )?application|you applied)\b/i;
/** Any hiring talk at all; "Have they asked you to..." only makes sense on a job message. */
const JOB_TALK = /\b(?:job|role|position|internship|intern|hire|hiring|interview|offer|recruit\w*|candidate|apply|application|salary|pay)\b/i;
const CHAT_INTERVIEW =
  /\binterview\w*\b[^.!?\n]{0,30}\b(?:by|over|via|through)\s+(?:text|chat)\b|\b(?:text|chat)[- ](?:based\s+)?interview|\binterview\w*\s+(?:is|will be)\s+(?:an?\s+)?(?:text|chat)\b/i;
const IMPLIES_HIRED =
  /\b(?:offer|hired|hire you|selected|congratulations|welcome aboard|welcome to the team|onboarding|start date|you have been chosen|position is yours)\b/i;
const GENERIC_GREETING =
  /^\s*(?:dear\s+(?:candidate|applicant|sir|madam|sir\/madam|job\s*seeker|friend|user|student|beneficiary)|hello\s+dear|hi\s+dear|greetings(?:\s+of the day)?)\b/i;
const HR_PORTAL =
  /\b(?:portal|workday|successfactors|bamboohr|adp|gusto|rippling|paylocity|icims|taleo|oracle hcm|hr system|onboarding system|secure (?:site|link|form|upload))\b/i;
const APP_NAMES:[RegExp, string][] = [
  [/whats\s?app/i, "WhatsApp"],
  [/telegram/i, "Telegram"],
  [/signal/i, "Signal"],
  [/wechat/i, "WeChat"],
  [/viber/i, "Viber"],
  [/hangouts/i, "Google Hangouts"],
  [/^text\b|\bsms\b/i, "texting a personal number"],
];
/** Personal-assistant scam duties: handling payments and buying gifts for someone you've never met. */
const PAYMENT_DUTIES =
  /\b(?:making|receiving|processing|handling|accepting)\s+(?:or\s+\w+\s+)?payments?\b[^.!?\n]{0,60}\b(?:sending|buying|purchasing)\s+(?:\w+\s+)?gifts?\b/i;

// ---------- helpers ----------

/** Insert user/AI text into copy only if it can't smuggle in a banned word. */
const named = (s: string | null | undefined, fallback: string) => (s && !BANNED_WORDS.test(s) ? s : fallback);

function levelFor(score: number): RiskLevel {
  return score >= W.highFrom ? "high" : score >= W.mediumFrom ? "medium" : "low";
}

function ago(days: number): string {
  const d = Math.max(0, Math.round(days));
  if (d < 14) return d === 1 ? "1 day ago" : `${d} days ago`;
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  return `${Math.round(d / 30)} months ago`;
}


function digitsIn(a: string, b: string): boolean {
  const d = a.replace(/\D/g, "");
  return d.length >= 7 && b.replace(/\D/g, "").includes(d);
}

/** Second Quote Check guard: drop every fact whose quote isn't in the message. */
function verifyFacts(f: Facts, text: string): Facts {
  const q = (x: Quoted | null) => (x && quoteIsReal(x.quote, text) ? x : null);
  const real = <T extends { quote: string }>(x: T | null) => (x && quoteIsReal(x.quote, text) ? x : null);
  const interviewOk = f.interview.status !== "unclear" && quoteIsReal(f.interview.quote, text);
  return {
    ...f,
    company: q(f.company),
    role: q(f.role),
    pay: q(f.pay),
    sender: {
      name: f.sender.name,
      email: f.sender.email && quoteIsReal(f.sender.email, text) ? f.sender.email : null,
      phone: f.sender.phone && digitsIn(f.sender.phone, text) ? f.sender.phone : null,
    },
    asks: f.asks.filter((a) => quoteIsReal(a.quote, text)),
    offPlatform: real(f.offPlatform),
    pressure: f.pressure.filter((p) => quoteIsReal(p.quote, text)),
    interview: interviewOk ? f.interview : { status: "unclear", quote: null },
    dutiesVague: real(f.dutiesVague),
    noExperienceNeeded: real(f.noExperienceNeeded),
    otherConcerns: f.otherConcerns.filter((c) => quoteIsReal(c.quote, text)).slice(0, 3),
  };
}

const COMPANY_STOPWORDS = new Set([
  "inc", "llc", "ltd", "the", "and", "group", "company", "corp", "corporation", "co", "partners", "solutions", "services",
  "technologies", "systems", "team", "recruiting", "careers", "jobs", "hr", "no", "reply", "noreply",
]);

/** "myworkdayjobs.com" / "workday.com" -> "workday", "greenhouse-mail.io" -> "greenhouse". */
function platformKey(domain: string | null): string | null {
  if (!domain) return null;
  return domain.split(/[.-]/)[0].replace(/^my/, "").replace(/jobs$/, "") || null;
}

/** Does a hiring-platform address belong to this company? Its name in the address, or a posting on that platform. */
function platformFits(email: string, platformDomain: string, company: string, posting: ScoreInput["steps"]["posting"]): boolean {
  const [local = "", host = ""] = email.toLowerCase().split("@");
  const sub = host.endsWith(`.${platformDomain}`) ? host.slice(0, -(platformDomain.length + 1)) : "";
  const hay = `${local}.${sub}`.replace(/[^a-z0-9]/g, "");
  const words = company.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !COMPANY_STOPWORDS.has(w));
  const whole = company.toLowerCase().replace(/[^a-z0-9]/g, "");
  if ((whole.length >= 3 && hay.includes(whole)) || words.some((w) => hay.includes(w))) return true;
  if (posting.status !== "done" || !posting.data.found || !posting.data.url) return false;
  return platformKey(registrableDomain(posting.data.url)) === platformKey(platformDomain);
}

function lookalikeWhy(kind: LookalikeKind, sender: string, official: string): string {
  if (kind === "extra_words") return `${sender} adds extra words to the company's real website, ${official}. Scammers register names like this.`;
  if (kind === "different_ending") return `${sender} uses the company's name with a different ending than the real website, ${official}.`;
  return `${sender} is spelled almost like the company's real website, ${official}, but isn't the same.`;
}

// ---------- the engine ----------

interface Evaluated {
  report: Omit<Report, "questions">;
  relevant: Relevance;
}

function evaluate(input: ScoreInput): Evaluated {
  // `raw` is what the user sees (quotes must match it); `text` is the cleaned copy every rule reads.
  const raw = input.text ?? "";
  const cleaned = cleanText(raw);
  const text = cleaned.text;
  const answers = input.answers ?? {};
  const facts = input.facts ? verifyFacts(input.facts, raw) : null;
  const hits = backstop(text);
  const hit = (id: BackstopId) => hits.find((h) => h.id === id) ?? null;
  const ask = (kind: AskKind) => facts?.asks.find((a) => a.kind === kind) ?? null;

  const flags: Flag[] = [];
  const add = (f: Flag) => {
    if (!flags.some((x) => x.id === f.id)) flags.push(f);
  };
  const red = (id: string, group: FlagGroup, points: number, title: string, why: string, quote: string | null, extra: Partial<Flag> = {}) =>
    add({ id, group, kind: "red", title, quote, why, points, critical: false, ...extra });
  const good = (id: string, group: FlagGroup, points: number, title: string, why: string, quote: string | null = null) =>
    add({ id, group, kind: "good", title, quote, why, points, critical: false });

  const source = (answers.channel && answers.channel !== "other" ? answers.channel : null) ?? input.source;
  // "Did you apply first?" overrides the channel guess; Handshake or the company site imply it.
  const appliedFirst = answers.who_first === "yes" || (answers.who_first !== "no" && (source === "company_site" || source === "handshake"));
  // Rule 10: you applied (said so, or the stage is past the first message) and the text names a booked interview:
  // "Reply YES to confirm" is then ordinary scheduling, not a surprise text.
  const confirmedInterview =
    (answers.who_first === "yes" || (input.stage !== null && input.stage !== "message")) && namesScheduledInterview(text);
  const ticked = Array.isArray(answers.asked_to_do) ? answers.asked_to_do : [];
  const signed = input.stage === "signed" || answers.signed_offer === "yes";
  const company = facts?.company?.value ?? (input.form.company?.trim() || null);
  const companyLabel = named(company, "this company");

  // Off-platform and the sender's address are read first: the run-code rule depends on them.
  const offFact = facts?.offPlatform ?? null;
  const offHit = hit("off_platform");
  const offPlatform = offFact || offHit;
  const chatChannel = source === "text_whatsapp" || Boolean(offPlatform);

  const senderStep = input.steps.sender.status === "done" ? input.steps.sender.data : null;
  const senderEmail = senderStep?.email ?? facts?.sender.email ?? (input.form.sender?.includes("@") ? input.form.sender.trim() : null);
  const senderDomain = senderStep?.domain ?? emailDomain(senderEmail);
  const free = senderDomain ? Boolean(senderStep?.freeEmail) || isFreeEmail(senderDomain) : false;

  // ----- Offer: critical asks (facts ∪ backstop) -----
  for (const kind of CRITICAL_ASKS) {
    const h = hit(kind);
    const fact = ACTION_BACKSTOP_REQUIRED.has(kind) && !h ? null : ask(kind);
    if (!fact && !h) continue;
    const c = CRITICAL_COPY[kind];
    const quote = ACTION_BACKSTOP_REQUIRED.has(kind) ? h!.snippet : fact?.quote ?? h!.snippet;
    red(kind, "offer", W.critical, c.title, c.why, quote, { critical: true, sourceUrl: c.sourceUrl });
  }
  // What the user told us they were asked to do. Same criticals, no quote. (Sensitive data is below: it's stage-aware.)
  for (const [tick, kind] of TOLD_ASKS) {
    if (!ticked.includes(tick)) continue;
    const c = CRITICAL_COPY[kind];
    red(kind, "offer", W.critical, c.title, `You told us they asked for this. ${c.why}`, null, { critical: true, sourceUrl: c.sourceUrl });
  }

  // Money flowing the wrong way. One critical in the money family is enough; no double count.
  const wayHit = hit("money_wrong_way");
  if (wayHit && !flags.some((f) => MONEY_FAMILY.includes(f.id))) {
    const c = CRITICAL_COPY.money_wrong_way;
    red("money_wrong_way", "offer", W.critical, c.title, c.why, wayHit.snippet, { critical: true, sourceUrl: c.sourceUrl });
  }

  // Run their code: critical for remote-access tools, terminal pastes, switching off protection, and installers,
  // or when the ask comes with something else suspicious. A plain take-home from a company you applied to is +15.
  const codeHit = hit("run_code_or_install");
  const riskyRun = hit("risky_run");
  if ((codeHit || riskyRun) && !flags.some((f) => f.id === "run_code_or_install")) {
    const suspicious = chatChannel || free || CRYPTO_THEME.test(text) || (!appliedFirst && UNSOLICITED.test(text));
    const quote = riskyRun?.snippet ?? codeHit?.snippet ?? null;
    if (riskyRun || suspicious) {
      const c = CRITICAL_COPY.run_code_or_install;
      red("run_code_or_install", "offer", W.critical, c.title, c.why, quote, { critical: true });
    } else {
      red(
        "untrusted_code",
        "offer",
        W.untrustedCode,
        "They want you to run their code",
        "Take-home projects are normal, but code from a recruiter can hide malware. Confirm it with the company first and run it somewhere disposable.",
        quote,
      );
    }
  }

  // Invisible or look-alike characters were mixed into the message.
  if (cleaned.stripped + cleaned.replaced >= W.hiddenCharactersMin) {
    red(
      "hidden_characters",
      "message",
      W.hiddenCharacters,
      "The message hides characters",
      "Invisible or look-alike letters were mixed into the text. Scammers do this to slip past filters, so we read it with them removed.",
      null,
    );
  }

  const sensHit = hit("sensitive_data");
  const sensitiveAsked = Boolean(sensHit || ticked.includes("share_data"));
  if (sensitiveAsked) {
    const quote = sensHit?.snippet ?? null;
    // After a signed offer it's only a caution when they point you to an official portal,
    // not when they want it by reply, email, chat, or text.
    const viaPortal = HR_PORTAL.test(text);
    if (!signed || chatChannel || !viaPortal) {
      red("sensitive_data", "offer", W.critical, signed ? "They ask for private details by message" : "They ask for private details before a signed offer", "Your SSN, bank details, ID, or passwords should only go into an official HR portal after you sign an offer, never over chat, text, or plain email.", quote, { critical: true, sourceUrl: FTC_JOB_SCAMS });
    } else {
      red("sensitive_data", "offer", W.sensitiveCaution, "They ask for private details", "This can be normal after a signed offer. Only enter it in the company's official HR portal, not by replying to a message.", quote);
    }
  }

  // Rule 9: tax, work-eligibility, and payroll forms belong after a signed offer. A fee for them is already pay_fee.
  // An onboarding note ("welcome aboard, complete your I-9") from a hiring platform or the company's own domain is normal.
  const earlyOfficial = input.steps.company.status === "done" ? input.steps.company.data?.officialDomain ?? null : null;
  const onboardingNote = senderDomain !== null && (isHiringPlatform(senderDomain) || senderDomain === earlyOfficial) && IMPLIES_HIRED.test(text);
  const papers = signed || input.stage === "offer" || onboardingNote ? null : earlyPaperwork(text);
  if (papers && !flags.some((f) => f.id === "pay_fee")) {
    const withFee = papers.fee || ticked.includes("pay");
    red(
      "paperwork_too_early",
      "offer",
      withFee ? W.critical : W.paperwork,
      withFee ? "They want a fee for hiring paperwork" : "They want hiring paperwork before an offer",
      withFee
        ? "Real employers never charge for hiring forms, and these forms come after a signed offer."
        : "Forms like the I-9, W-4, or direct deposit come after you sign an offer, through the company's HR system. Asking early is a way to collect your details.",
      papers.quote,
      withFee ? { critical: true, sourceUrl: FTC_JOB_SCAMS } : {},
    );
  }

  const moneyOrData = flags.some((f) => f.critical) || sensitiveAsked;

  if (offPlatform) {
    const appRaw = offFact?.app ?? offHit?.match ?? "";
    const app = APP_NAMES.find(([re]) => re.test(appRaw))?.[1] ?? null;
    // Softer only when you applied first and they want no money or data (brief C4; the employer-abroad softening is gone).
    // A chat-only interview (by answer or in the text) is never softened and counts more than a channel move.
    const chatInterview = answers.talked_live === "chat_only" || CHAT_INTERVIEW.test(text);
    const soft = appliedFirst && !moneyOrData && !chatInterview;
    red(
      "off_platform",
      "message",
      chatInterview ? W.offPlatform + W.chatInterview : soft ? W.offPlatformAbroad : W.offPlatform,
      app ? `They want to move you to ${app}` : "They want a chat-only interview",
      soft
        ? "You applied first, so this counts for less. Still keep hiring on official channels."
        :"Real recruiters rarely move hiring to WhatsApp, Telegram, or chat-only interviews. Scammers do it to avoid platform checks.",
      offFact?.quote ?? offHit!.snippet,
    );
  }

  // ----- Message signals -----
  const yesFact = ask("reply_yes");
  const yesHit = hit("reply_yes");
  if ((yesFact || yesHit) && !confirmedInterview) {
    red("reply_yes", "message", W.replyYes, "It asks you to reply YES", "Messages asking you to reply YES are a common way scammers find people who will answer.", yesFact?.quote ?? yesHit!.snippet);
  }

  const pressureQuote = facts?.pressure[0]?.quote ?? hit("pressure")?.snippet ?? null;
  if (pressureQuote) {
    red("pressure", "message", W.pressure, "They're rushing you", "Pressure to act fast is meant to stop you from checking. Real offers give you time to think.", pressureQuote);
  }

  const secrecy = hit("secrecy");
  if (secrecy) {
    red("secrecy", "message", W.secrecy, "They ask you to keep it secret", "Real employers don't ask you to hide a job from your bank, school, or family, or to avoid checking with them. Secrecy keeps people from spotting a scam.", secrecy.snippet);
  }

  const greeting = GENERIC_GREETING.exec(text);
  if (greeting) {
    red("generic_greeting", "message", W.genericGreeting, "Generic greeting", "Messages that don't use your name are often sent to many people at once. This is a weak sign on its own.", greeting[0].trim());
  }

  const concerns: { text: string; quote: string }[] = [
    ...(facts?.otherConcerns ?? []),
    ...(facts?.asks.filter((a) => a.kind === "other").map((a) => ({ text: "Something they ask you to do looked off", quote: a.quote })) ?? []),
  ];
  let concernBudget: number = W.otherConcernsMax;
  concerns.slice(0, 3).forEach((c, i) => {
    const pts = Math.min(W.otherConcernEach, concernBudget);
    if (pts <= 0) return;
    concernBudget -= pts;
    const title = named(c.text.trim().slice(0, 90), "Something else in the message looked off");
    red(`other_concern_${i + 1}`, "message", pts, title, "Our message reader noticed this. It counts for a little on its own.", c.quote);
  });

  // ----- Interview and the offer itself -----
  const impliesHired = input.stage === "offer" || input.stage === "signed" || IMPLIES_HIRED.test(text);
  const noInterviewFact = facts?.interview.status === "none_hired_directly" ? facts.interview.quote : null;
  const noInterviewHit = hit("no_interview")?.snippet ?? null;
  const interviewUnclear = !noInterviewFact && !noInterviewHit && (facts === null || facts.interview.status === "unclear");
  if (noInterviewFact || noInterviewHit || (interviewUnclear && impliesHired && answers.talked_live === "not_yet")) {
    red("no_interview", "offer", W.noInterview, "You'd be hired without an interview", "Real employers interview you before making an offer.", noInterviewFact ?? noInterviewHit);
  }
  // A chat-only "interview" shares its cap with the off-platform flag: a WhatsApp chat interview counts once.
  if (answers.talked_live === "chat_only" && !flags.some((f) => f.id === "off_platform")) {
    red("chat_only_interview", "message", W.offPlatform, "You've only talked by chat", "Real employers talk to you on a call or video before hiring. Chat-only interviews are a common scam setup.", null);
  }

  if (facts?.dutiesVague && facts.noExperienceNeeded && facts.pay) {
    red("vague_easy_pay", "offer", W.vagueEasyPayCombo, "Vague duties, easy pay, no experience needed", "This mix of unclear work, easy money, and no experience needed is a classic scam pattern.", facts.dutiesVague.quote);
  }

  const tasks = taskVocab(text);
  const pattern = tasks ? null : matchFieldPattern(text, input.profile?.field ?? null, source);
  if (tasks) {
    red("field_pattern", "offer", W.taskVocab, "This looks like a task scam", "Liking videos, boosting products, or finishing sets of tasks for commission is a known task scam. The money you see is bait for a deposit later.", tasks.quote, { sourceUrl: "https://consumer.ftc.gov/consumer-alerts/2025/08/how-spot-avoid-task-scams" });
  } else if (pattern) {
    red("field_pattern", "offer", W.fieldPattern, `This looks like ${pattern.label}`, pattern.why, pattern.quote);
  }
  const duties = PAYMENT_DUTIES.exec(text);
  if (duties) {
    red("payment_duties", "offer", W.paymentDuties, "The job is handling payments for them", "Jobs where you make or receive payments and buy gifts for an employer you've never met are how fake-check and money-mule scams start.", snippetAround(text, duties.index, duties.index + duties[0].length));
  }

  if (input.profile && input.resumeText !== null) {
    const above = roleAboveLevel(facts?.role ?? null, text, input.profile, input.resumeText);
    if (above) red("role_above_level", "offer", W.roleAboveLevel, "This role is far above your level", above.why, above.quote);
  }

  // ----- Sender -----
  if (source === "text_whatsapp" && !appliedFirst && !confirmedInterview) {
    red("surprise_text", "sender", W.surpriseText, "This came as a surprise text", "Unexpected job texts and WhatsApp messages are one of the most common ways job scams start.", null);
  } else if (appliedFirst) {
    good(
      "applied_first",
      "sender",
      W.appliedFirst,
      "You applied first",
      answers.who_first === "yes"
        ? "You told us you applied first, so this isn't a surprise message out of nowhere."
        : source === "handshake"
          ? "You started this on Handshake, so this isn't a surprise message out of nowhere."
          : "You applied on the company's own site, so this isn't a surprise message out of nowhere.",
    );
  }
  // Not every unsolicited contact is fraud (FTC), so this stays small.
  if (answers.who_first === "no") {
    red("unsolicited", "sender", W.unsolicited, "They reached out first", "You didn't apply. Most job scams start with an offer out of nowhere, though real recruiters do this too.", null);
  }

  const official = input.steps.company.status === "done" ? input.steps.company.data?.officialDomain ?? null : null;
  const emailQuote = senderEmail && quoteIsReal(senderEmail, raw) ? senderEmail : null;
  const platform = senderDomain ? isHiringPlatform(senderDomain) : false;
  const domainLabel = named(senderDomain, "this email's website");
  const officialLabel = named(official, "the company's website");

  let senderIsNew = false;
  if (senderDomain && !free && !platform && senderStep?.registeredAt) {
    const days = (Date.now() - Date.parse(senderStep.registeredAt)) / DAY_MS;
    if (Number.isFinite(days) && days < W.newDomainDays) {
      senderIsNew = true;
      red("new_domain", "sender", W.newDomain, "This email's website is brand new", `${domainLabel} was created ${ago(days)}. Scam websites are often only weeks old. New real startups exist too, so this alone isn't decisive.`, emailQuote);
    }
  }

  let contactOk: boolean | null = null;
  if (senderDomain && free) {
    contactOk = false;
    if (company) {
      const startup = STARTUP_WORDS.test(text);
      red(
        "free_email",
        "sender",
        startup ? W.freeEmailStartup : W.freeEmailEstablished,
        "Sent from a free email account",
        startup
          ? `Some small startups use free email like ${domainLabel}, but scammers do too. Check the company another way.`
          : `A recruiter at ${companyLabel} would write from a company email, not ${domainLabel}.`,
        emailQuote,
      );
    }
  } else if (senderDomain && platform) {
    // Never a mismatch flag. The good sign needs the address or a posting to tie it to this company.
    const fits = Boolean(company && senderEmail && platformFits(senderEmail, senderDomain, company, input.steps.posting));
    contactOk = fits ? true : null;
    if (fits) good("hiring_platform", "sender", W.hiringPlatform, "Sent through a hiring platform", `${domainLabel} is a hiring system many real companies use to email applicants, and this address matches ${companyLabel}.`, emailQuote);
  } else if (senderDomain && official) {
    if (senderDomain === official) {
      contactOk = true;
      if (!senderIsNew) good("official_domain", "sender", W.officialDomain, "Sent from the company's real website", `${domainLabel} is the company's official website.`, emailQuote);
    } else {
      const kind = lookalike(senderDomain, official);
      contactOk = kind ? false : null;
      if (kind) red("lookalike_domain", "sender", W.lookalike, `The email's website looks like ${officialLabel}, but isn't`, lookalikeWhy(kind, domainLabel, officialLabel), emailQuote);
    }
  }

  if (senderStep?.hunter?.disposable) {
    red("throwaway_email", "sender", W.throwawayEmail, "This email address is a throwaway one", "Throwaway addresses stop working after a short time. Real recruiters don't use them.", emailQuote);
  }

  if (senderStep && !free && senderStep.hasMx === false) {
    red("no_mx", "sender", W.noMx, "This email's website can't receive email", `${domainLabel} isn't set up to receive email, which is odd for a real company.`, emailQuote);
  }

  // ----- Impersonated institution and visa threats (rule 8) -----
  // Only the exact .edu/.gov (or a country form) is a match. Hiring platforms and an unknown sender are never flagged for this alone.
  const claim = claimedInstitution(text);
  const relay = relayQuote(text);
  const threat = visaThreat(text);
  const senderIsInstitution = senderDomain ? isInstitutionDomain(senderDomain) : false;
  // A real .edu/.gov sender using a bulk-mail relay is fine; the relay only counts when the sender is unknown.
  const wrongSender = senderDomain !== null ? !platform && !senderIsInstitution : relay !== null;
  const payNow = flags.some((f) => ["pay_fee", "gift_cards", "crypto_or_task_deposit", "money_wrong_way", "deposit_check"].includes(f.id)) || paymentAsk(text) !== null;
  if (claim && wrongSender && !flags.some((f) => f.id === "lookalike_domain")) {
    const overlap = flags.some((f) => f.id === "free_email");
    const who = claim.kind === "immigration" ? "an immigration office" : claim.kind === "government" ? "a government office" : "a university office";
    red(
      "impersonation",
      "sender",
      payNow ? W.critical : overlap ? W.impersonationOverlap : W.impersonation,
      `It says it's from ${who}, but the sender doesn't match`,
      relay
        ? "The message was sent through a bulk-mail service, not from the school or agency's own address. Real offices write from their .edu or .gov address."
        : "Real university and government offices write from their own .edu or .gov address. This sender uses a different one.",
      relay ?? claim.quote,
      payNow ? { critical: true, sourceUrl: FTC_JOB_SCAMS } : {},
    );
  }
  if (threat && !senderIsInstitution) {
    red(
      "visa_threat",
      "message",
      payNow ? W.critical : W.visaThreat,
      "It threatens your visa or student status",
      "Real offices don't threaten to end your OPT, visa, or status by message, or ask for money to keep it. Scammers use fear of losing status to rush people.",
      threat,
      payNow ? { critical: true, sourceUrl: FTC_JOB_SCAMS } : {},
    );
  }

  // ----- Posting -----
  let postingMatch: Report["postingMatch"] = null;
  if (input.steps.posting.status === "done" && input.steps.posting.data.found) {
    const posting = input.steps.posting.data;
    const role = facts?.role?.value ?? null;
    const pay = facts?.pay?.value ?? null;
    postingMatch = matchRows({ posting, company, officialDomain: official, role, pay, senderDomain, contactOk });
    if (posting.onOfficialDomain) {
      const roleOk = rolesMatch(role, posting.title);
      const payOk = payMatch(pay, posting.pay);
      if (roleOk === false || payOk === false) {
        const what = roleOk === false && payOk === false ? "role and pay" : roleOk === false ? "role" : "pay";
        red("posting_mismatch", "offer", W.postingMismatch, "The details don't match the real posting", `The ${what} in the message is different from the company's own posting.`, roleOk === false ? facts?.role?.quote ?? null : facts?.pay?.quote ?? null, { sourceUrl: posting.url ?? undefined });
      } else {
        add({ id: "posting_found", group: "offer", kind: "good", title: "The role is on the company's own careers site", quote: null, why: `We found this role listed on ${officialLabel}.`, points: W.postingOnOfficialSite, critical: false, sourceUrl: posting.url ?? undefined });
      }
    }
  }

  // ----- Links (local checks only; the link is never opened) -----
  const links = checkLinks(text, { company, officialDomain: official });
  const firstWith = (issue: LinkIssue) => links.find((l) => l.issues.includes(issue))?.url ?? null;
  const fakeSite = firstWith("lookalike") ?? firstWith("brand-careers-offsite");
  // A look-alike sender already covers the same trick; don't count it twice.
  if (fakeSite && !flags.some((f) => f.id === "lookalike_domain")) {
    red("link_lookalike", "message", W.linkLookalike, "A link copies the company's website", `This link isn't on ${officialLabel}, but it's made to look like it.`, fakeSite);
  }
  const puny = firstWith("punycode");
  if (puny) red("link_punycode", "message", W.linkPunycode, "A link uses disguised letters", "The web address uses special characters that can make a fake site look like a real one.", puny);
  const ip = firstWith("raw-ip");
  if (ip) red("link_raw_ip", "message", W.linkRawIp, "A link is a bare number address", "Real companies link to their named website, not a string of numbers.", ip);
  const form = firstWith("google-form");
  if (form) {
    red(
      "link_google_form",
      "message",
      sensitiveAsked ? W.critical : W.linkGoogleForm,
      "They use a Google Form for hiring",
      sensitiveAsked
        ? "Real employers never collect your SSN or bank details through a Google Form."
        : "Real companies collect applications through their own careers site, not a free form anyone can make.",
      form,
      { critical: sensitiveAsked },
    );
  }
  const short = firstWith("shortener");
  if (short) red("link_shortener", "message", W.linkShortener, "A link hides where it goes", "Short links hide the real address until you click.", short);

  // ----- Score -----
  const anyCritical = flags.some((f) => f.critical);
  // Quotes read from the cleaned text are shown as the user's own wording; every flag gets severity, a step, and a link.
  const kept = (anyCritical ? flags.filter((f) => f.kind === "red") : flags).map((f) => withFlagInfo({ ...f, quote: visibleQuote(f.quote, raw) }));
  const redSum = kept.filter((f) => f.kind === "red").reduce((n, f) => n + f.points, 0);
  const goodSum = anyCritical ? 0 : Math.max(W.goodSignCap, kept.filter((f) => f.kind === "good").reduce((n, f) => n + f.points, 0));
  let total = redSum + goodSum;
  if (anyCritical) total = Math.max(total, W.criticalFloor);
  const finalScore = Math.min(100, Math.max(0, Math.round(total)));

  kept.sort((a, b) => {
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "red" ? -1 : 1;
    return Math.abs(b.points) - Math.abs(a.points);
  });
  const groups: Record<FlagGroup, Flag[]> = { sender: [], message: [], offer: [] };
  for (const f of kept) groups[f.group].push(f);

  // Findings 02 > 4.1 triggers. pickQuestions then keeps only the ones whose answers matter.
  const relevant: Relevance = {
    asked_to_do: !anyCritical && finalScore < W.highFrom && (finalScore >= W.mediumFrom || impliesHired || JOB_TALK.test(text)),
    who_first: input.source === null && answers.channel !== "handshake" && !APPLIED_TEXT.test(text),
    channel: input.source === null && !senderEmail && !facts?.sender.phone,
    talked_live: interviewUnclear && impliesHired,
    signed_offer: sensitiveAsked && input.stage === null,
  };

  const thinMessage = text.trim().split(/\s+/).filter(Boolean).length < 20;
  const { couldntCheck, coverage } = buildCoverage(input, { senderEmailKnown: Boolean(senderEmail), thinMessage });

  // "How sure": separate from the risk itself (research 01 > 3.4). A critical flag is enough on its own;
  // otherwise it depends on how many of the weighted checks could run.
  const confidence: NonNullable<Report["confidence"]> = {
    level: anyCritical ? "high" : thinMessage ? "low" : coverage.ran >= W.sureFrom ? "high" : coverage.ran >= W.fairlySureFrom ? "medium" : "low",
    checked: coverage.ran,
    total: coverage.total,
  };

  return {
    relevant,
    report: {
      score: finalScore,
      level: levelFor(finalScore),
      flags: kept,
      groups,
      couldntCheck,
      coverage,
      postingMatch,
      thinMessage,
      confidence,
      links,
    },
  };
}

export function score(input: ScoreInput): Report {
  const { report, relevant } = evaluate(input);
  const outcomeOf = (i: ScoreInput) => {
    const r = evaluate(i).report;
    return { level: r.level, critical: r.flags.some((f) => f.critical) };
  };
  const questions = pickQuestions(input, relevant, outcomeOf);
  const couldntCheck = [...report.couldntCheck, ...questionGaps(relevant, input.answers ?? {}, questions)];
  return { ...report, couldntCheck, questions, questionHint: questionHint(input, questions, outcomeOf) };
}

/** One line saying why the score changed after a quick-question answer, or null if it didn't. */
export function describeChange(prev: Report, next: Report): string | null {
  if (prev.score === next.score) return null;
  const up = next.score > prev.score;
  const dir = up ? "up" : "down";
  const before = new Map(prev.flags.map((f) => [f.id, f]));
  const after = new Map(next.flags.map((f) => [f.id, f]));
  let best: { id: string; delta: number; flag: Flag } | null = null;
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const delta = (after.get(id)?.points ?? 0) - (before.get(id)?.points ?? 0);
    if (delta === 0 || delta > 0 !== up) continue;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { id, delta, flag: (after.get(id) ?? before.get(id))! };
  }
  if (!best) return `Score went ${dir} from ${prev.score} to ${next.score}`;
  const phrase = CHANGE_REASONS[best.id]?.[dir];
  if (phrase) return `Score went ${dir} because ${phrase}`;
  const title = best.flag.title.charAt(0).toLowerCase() + best.flag.title.slice(1);
  const added = after.has(best.id) && !before.has(best.id);
  if (best.flag.kind === "red") {
    return added ? `Score went up because of a new warning sign: ${title}` : `Score went down because this no longer applies: ${title}`;
  }
  return added ? `Score went down because of a good sign: ${title}` : `Score went up because this good sign no longer applies: ${title}`;
}
