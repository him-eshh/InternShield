// The scoring engine (spec.md > Scoring Engine). Pure: no network, env, or React.
// AI facts and the raw-text backstop are combined; fixed rules decide the score.
import { parsePhoneNumberFromString } from "libphonenumber-js/min";
import type { AskKind, Facts, Flag, FlagGroup, Quoted, Report, RiskLevel, ScoreInput } from "../types";
import { quoteIsReal } from "../quotes";
import { backstop, type BackstopId } from "./backstop";
import { buildCoverage } from "./coverage";
import { emailDomain, isFreeEmail, isHiringPlatform, lookalike, registrableDomain, type LookalikeKind } from "./domains";
import { roleAboveLevel } from "./level";
import { matchFieldPattern } from "./patterns";
import { matchRows, payMatch, rolesMatch } from "./posting";
import { pickQuestions, questionGaps, type Relevance } from "./questions";
import { BANNED_WORDS, CHANGE_REASONS, WEIGHTS as W } from "./rules";

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
    title: "They want you to deposit a check and send money on",
    why: "This is the fake-check scam: the check bounces days later and you owe the bank everything you sent.",
    sourceUrl: FTC_FAKE_CHECKS,
  },
  gift_cards: {
    title: "They bring up gift cards",
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
    why: "Fake coding tests and \"drivers\" from recruiters are used to put malware on your computer.",
  },
};
const CRITICAL_ASKS = Object.keys(CRITICAL_COPY) as CriticalAsk[];

const STARTUP_WORDS =
  /\b(?:start-?up|small business|small team|small company|early[- ]stage|pre-seed|seed[- ]stage|family[- ]owned|stealth|just launched|co-?founder|founder)\b/i;
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
];

// ---------- helpers ----------

/** Insert user/AI text into copy only if it can't smuggle in a banned word. */
const named = (s: string | null | undefined, fallback: string) => (s && !BANNED_WORDS.test(s) ? s : fallback);

export function levelFor(score: number): RiskLevel {
  return score >= W.highFrom ? "high" : score >= W.mediumFrom ? "medium" : "low";
}

function ago(days: number): string {
  const d = Math.max(0, Math.round(days));
  if (d < 14) return d === 1 ? "1 day ago" : `${d} days ago`;
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  return `${Math.round(d / 30)} months ago`;
}

function phoneCountry(phone: string | null): string | null {
  if (!phone) return null;
  try {
    return parsePhoneNumberFromString(phone, "US")?.country ?? null;
  } catch {
    return null;
  }
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
  const text = input.text ?? "";
  const answers = input.answers ?? {};
  const facts = input.facts ? verifyFacts(input.facts, text) : null;
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

  const source = answers.source && answers.source !== "unknown" ? answers.source : input.source;
  const signed = input.stage === "signed" || answers.signed_offer === "yes";
  const company = facts?.company?.value ?? (input.form.company?.trim() || null);
  const companyLabel = named(company, "this company");

  // ----- Offer: critical asks (facts ∪ backstop) -----
  for (const kind of CRITICAL_ASKS) {
    const fact = ask(kind);
    const h = hit(kind);
    if (!fact && !h) continue;
    const c = CRITICAL_COPY[kind];
    red(kind, "offer", W.critical, c.title, c.why, fact?.quote ?? h!.snippet, { critical: true, sourceUrl: c.sourceUrl });
  }

  // ----- Off-platform (needed for sensitive-data channel and the abroad rule) -----
  const offFact = facts?.offPlatform ?? null;
  const offHit = hit("off_platform");
  const offPlatform = offFact || offHit;
  const chatChannel = source === "text_whatsapp" || Boolean(offPlatform);

  const sensFact = ask("sensitive_data");
  const sensHit = hit("sensitive_data");
  const sensitiveAsked = Boolean(sensFact || sensHit);
  if (sensitiveAsked) {
    const quote = sensFact?.quote ?? sensHit!.snippet;
    // After a signed offer it's only a caution when they point you to an official portal,
    // not when they want it by reply, email, chat, or text.
    const viaPortal = HR_PORTAL.test(text);
    if (!signed || chatChannel || !viaPortal) {
      red("sensitive_data", "offer", W.critical, signed ? "They ask for private details by message" : "They ask for private details before a signed offer", "Your SSN, bank details, ID, or passwords should only go into an official HR portal after you sign an offer, never over chat, text, or plain email.", quote, { critical: true, sourceUrl: FTC_JOB_SCAMS });
    } else {
      red("sensitive_data", "offer", W.sensitiveCaution, "They ask for private details", "This can be normal after a signed offer. Only enter it in the company's official HR portal, not by replying to a message.", quote);
    }
  }

  const moneyOrData = flags.some((f) => f.critical) || sensitiveAsked;

  // Employer country: answer first, else the AI's hint, else the phone's country code.
  const hint = facts?.employerCountryHint?.trim() || null;
  const hintAbroad = hint ? !/^(?:us|u\.s\.?|usa|u\.s\.a\.?|united states|america)\b/i.test(hint) : null;
  const phone = facts?.sender.phone ?? /\+\d[\d\s().-]{7,18}\d/.exec(text)?.[0] ?? null;
  const country = phoneCountry(phone);
  const autoAbroad = hintAbroad ?? (country ? country !== "US" : null);
  const abroad = answers.outside_us === "yes" ? true : answers.outside_us === "no" ? false : autoAbroad;

  if (offPlatform) {
    const appRaw = offFact?.app ?? offHit?.match ?? "";
    const app = APP_NAMES.find(([re]) => re.test(appRaw))?.[1] ?? null;
    const soft = abroad === true && !moneyOrData;
    red(
      "off_platform",
      "message",
      soft ? W.offPlatformAbroad : W.offPlatform,
      app ? `They want to move you to ${app}` : "They want a chat-only interview",
      soft
        ? "Chat apps are common for work in some countries, so this counts for less. Still keep hiring on official channels."
        : "Real recruiters rarely move hiring to WhatsApp, Telegram, or chat-only interviews. Scammers do it to avoid platform checks.",
      offFact?.quote ?? offHit!.snippet,
    );
  }

  // ----- Message signals -----
  const yesFact = ask("reply_yes");
  const yesHit = hit("reply_yes");
  if (yesFact || yesHit) {
    red("reply_yes", "message", W.replyYes, "It asks you to reply YES", "Messages asking you to reply YES are a common way scammers find people who will answer.", yesFact?.quote ?? yesHit!.snippet);
  }

  const pressureQuote = facts?.pressure[0]?.quote ?? hit("pressure")?.snippet ?? null;
  if (pressureQuote) {
    red("pressure", "message", W.pressure, "They're rushing you", "Pressure to act fast is meant to stop you from checking. Real offers give you time to think.", pressureQuote);
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
  if (noInterviewFact || noInterviewHit || (interviewUnclear && impliesHired && answers.had_interview === "no")) {
    red("no_interview", "offer", W.noInterview, "You'd be hired without an interview", "Real employers interview you before making an offer.", noInterviewFact ?? noInterviewHit);
  }

  if (facts?.dutiesVague && facts.noExperienceNeeded && facts.pay) {
    red("vague_easy_pay", "offer", W.vagueEasyPayCombo, "Vague duties, easy pay, no experience needed", "This mix of unclear work, easy money, and no experience needed is a classic scam pattern.", facts.dutiesVague.quote);
  }

  const pattern = matchFieldPattern(text, input.profile?.field ?? null, source);
  if (pattern) {
    red("field_pattern", "offer", W.fieldPattern, `This looks like ${pattern.label}`, pattern.why, pattern.quote);
  }

  if (input.profile && input.resumeText !== null) {
    const above = roleAboveLevel(facts?.role ?? null, text, input.profile, input.resumeText);
    if (above) red("role_above_level", "offer", W.roleAboveLevel, "This role is far above your level", above.why, above.quote);
  }

  // ----- Sender -----
  if (source === "text_whatsapp") {
    red("surprise_text", "sender", W.surpriseText, "This came as a surprise text", "Unexpected job texts and WhatsApp messages are one of the most common ways job scams start.", null);
  } else if (source === "company_site" || source === "handshake") {
    good("applied_first", "sender", W.appliedFirst, "You applied first", source === "handshake" ? "You started this on Handshake, so this isn't a surprise message out of nowhere." : "You applied on the company's own site, so this isn't a surprise message out of nowhere.");
  }

  const senderStep = input.steps.sender.status === "done" ? input.steps.sender.data : null;
  const senderEmail = senderStep?.email ?? facts?.sender.email ?? (input.form.sender?.includes("@") ? input.form.sender.trim() : null);
  const senderDomain = senderStep?.domain ?? emailDomain(senderEmail);
  const official = input.steps.company.status === "done" ? input.steps.company.data?.officialDomain ?? null : null;
  const emailQuote = senderEmail && quoteIsReal(senderEmail, text) ? senderEmail : null;
  const free = senderDomain ? Boolean(senderStep?.freeEmail) || isFreeEmail(senderDomain) : false;
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

  // ----- Score -----
  const anyCritical = flags.some((f) => f.critical);
  const kept = anyCritical ? flags.filter((f) => f.kind === "red") : flags;
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

  const relevant: Relevance = {
    outside_us: Boolean(offPlatform) && !moneyOrData && autoAbroad === null,
    source: input.source === null,
    signed_offer: sensitiveAsked && input.stage === null,
    had_interview: interviewUnclear && impliesHired,
  };

  const thinMessage = text.trim().split(/\s+/).filter(Boolean).length < 20;
  const { couldntCheck, coverage } = buildCoverage(input, { senderEmailKnown: Boolean(senderEmail), thinMessage });

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
    },
  };
}

export function score(input: ScoreInput): Report {
  const { report, relevant } = evaluate(input);
  const questions = pickQuestions(input, relevant, (i) => evaluate(i).report.score);
  const couldntCheck = [...report.couldntCheck, ...questionGaps(relevant, input.answers ?? {}, questions)];
  return { ...report, couldntCheck, questions };
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
