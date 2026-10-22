// Pre-written explanation + banned-word filter (spec.md > Explain Route).
// Imported by browser code too: no server-only imports here.
import type { ExplainRequest } from "./types";

const BANNED = /\b(safe|safely|safety|legit|legitimate|guaranteed?)\b/i;

export function hasBannedWord(text: string): boolean {
  return BANNED.test(text);
}

// Calm sentences matched on the flag title (the request carries no flag id).
const SENTENCES: [RegExp, string][] = [
  [/deposit|fake check|cashier|mailed (?:a )?check/i, "You're asked to deposit a check and send money on, which is a common way scammers pull cash from students before the check bounces."],
  [/equipment|laptop|software|vendor/i, "You're asked to buy equipment yourself, and real employers don't ask new hires to front that cost."],
  [/gift ?card/i, "Gift cards are requested, and no real employer is paid back that way."],
  [/crypto|bitcoin|task deposit/i, "Crypto or a deposit is requested, and a real job never needs you to pay in to start earning."],
  [/\bfees?\b|pay(?:ment)? (?:to|for)|training cost/i, "A fee is requested up front, and real employers don't charge you to hire you."],
  [/forward|reship|re-ship|package/i, "You're asked to receive and forward money or packages, which is a common way to be used to move stolen goods."],
  [/install|run code|download|software to/i, "You're asked to run code or install something, so check with the company before you do."],
  [/\bssn\b|social security|bank|sensitive|passport|id (?:card|document)/i, "Sensitive personal details are requested early, so hold them back until you've confirmed the employer directly."],
  [/whatsapp|telegram|signal|off.?platform|text message|move the conversation/i, "The conversation is being moved to a private chat app, which makes it harder to verify who you're talking to."],
  [/urgent|pressure|24 hours|deadline|act now|respond (?:now|quickly)/i, "There's pressure to answer quickly, and a real recruiter will usually give you time to check."],
  [/no interview|hired directly|without an? interview|interview/i, "The hiring process skips or plays down an interview, which is unusual for a genuine role."],
  [/vague|duties|simple tasks/i, "The duties are vague, and a real posting normally describes the work clearly."],
  [/experience/i, "The message promises a role with no experience needed, which can be a hook rather than a real requirement."],
  [/lookalike|look-alike|impersonat|similar to/i, "The sender's website looks similar to a real company's but isn't the same, so double check the spelling."],
  [/free email|gmail|yahoo|outlook|personal email/i, "The sender uses a free personal email instead of a company address, which is worth double checking."],
  [/new domain|recently registered|domain age|registered/i, "The sender's website was registered very recently, which is common with throwaway scam sites."],
  [/\bmx\b|can't receive|cannot receive|no mail/i, "The sender's website doesn't appear to receive email, so replies may not reach a real company."],
  [/no (?:official|company|careers)|not found|couldn't find/i, "We couldn't find an official company website to compare against."],
  [/pay|salary|wage|\$/i, "The pay sounds unusually high for the work described, so it's worth comparing with similar listings."],
];

function sentenceFor(f: ExplainRequest["flags"][number], seen: Set<string>): string {
  const hit = SENTENCES.find(([re]) => re.test(f.title));
  const s = (hit ? hit[1] : f.why).trim();
  const base = s.endsWith(".") ? s : `${s}.`;
  const q = f.quote?.trim();
  if (!q || hasBannedWord(q)) return base;
  const k = q.toLowerCase();
  if (seen.has(k)) return base; // each quote at most once
  seen.add(k);
  return `${base} They wrote: "${q.replace(/"/g, "'")}".`;
}

/** Section titles used by the pre-written explanation. Lines starting with "## " are titles, "- " are bullets. */
export const FALLBACK_TITLES = { verdict: "Our take", flags: "What stood out", next: "What to do next" } as const;

/**
 * Pre-written explanation in short titled sections: a one-sentence verdict, the warning signs as
 * bullets, and the next step. Plain text with "## " titles and "- " bullets so Explanation can lay it out.
 */
export function fallbackExplanation({ level, flags }: ExplainRequest): string {
  const section = (title: string, ...lines: string[]) => [`## ${title}`, ...lines].join("\n");
  if (flags.length === 0) {
    return [
      section(FALLBACK_TITLES.verdict, "We didn't find any red flags in this message."),
      section(FALLBACK_TITLES.next, "That doesn't prove it's genuine, so apply through the company's official careers page."),
    ].join("\n\n");
  }
  const lead =
    level === "high"
      ? "This message shows strong signs of a scam."
      : level === "medium"
        ? "This message has some warning signs worth double checking."
        : "We didn't find strong red flags, but a few details are worth a look.";
  const seenQuotes = new Set<string>();
  // Top 3 only and no quotes: the evidence cards right below show every flag with its quote.
  const body = [...new Set(flags.map((f) => sentenceFor({ ...f, quote: null }, seenQuotes)))].slice(0, 3);
  const close =
    level === "high"
      ? "Please don't send money or personal details, and report it if you can."
      : level === "medium"
        ? "Before you reply, confirm the role on the company's official careers page."
        : "If anything still feels off, confirm the role on the company's official careers page.";
  const verdict = section(FALLBACK_TITLES.verdict, lead);
  const next = section(FALLBACK_TITLES.next, close);
  const text = [verdict, section(FALLBACK_TITLES.flags, ...body.map((b) => `- ${b}`)), next].join("\n\n");
  // Pre-written text must never trip the filter; fall back to the verdict + next step if a flag's own "why" does.
  return hasBannedWord(text) ? [verdict, next].join("\n\n") : text;
}

export interface ExplanationSection {
  title: string;
  /** "text" = short sentences shown as a paragraph; "list" = bullet points. */
  kind: "text" | "list";
  items: string[];
}

/** Parses "## Title" sections (the pre-written format). Returns null for ordinary paragraphs. */
export function explanationSections(text: string): ExplanationSection[] | null {
  if (!/^## /m.test(text)) return null;
  const out: ExplanationSection[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const title = lines[0].startsWith("## ") ? lines.shift()!.slice(3).trim() : "";
    const bullets = lines.filter((l) => l.startsWith("- "));
    const isList = bullets.length > 0 && bullets.length === lines.length;
    const items = isList ? bullets.map((l) => l.slice(2).trim()) : [lines.join(" ")];
    if (items.join("").trim()) out.push({ title, kind: isList ? "list" : "text", items });
  }
  return out.length ? out : null;
}

/** Plain text for copying or announcing: titles become "Title:" lines, bullets stay as "- ". */
export function explanationPlain(text: string): string {
  const secs = explanationSections(text);
  if (!secs) return text;
  return secs.map((s) => [s.title ? `${s.title}:` : "", ...(s.kind === "list" ? s.items.map((i) => `- ${i}`) : s.items)].filter(Boolean).join("\n")).join("\n\n");
}

const QUOTED = /"([^"\n]+)"|“([^”\n]+)”/g;
const MAX_EXPLAIN_CHARS = 700;
const MAX_EXPLAIN_PARAGRAPHS = 2;
const quoteKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Tidies AI explanation text: a sentence whose quotes were all shown earlier is dropped whole
 * (no dangling "They wrote:"), a repeat inside a sentence with a new quote becomes "the same line",
 * then at most 2 paragraphs, capped ~700 characters at a sentence end.
 */
export function tidyExplanation(text: string): string {
  const seen = new Set<string>();
  let out = text
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .replace(/[ \t]*\n[ \t]*/g, " ")
        // ponytail: sentence split on .!? + space; a quote holding ". " can split early (harmless here).
        .split(/(?<=[.!?]["”]?)\s+/)
        .flatMap((s) => {
          const keys = [...s.matchAll(QUOTED)].map((m) => quoteKey(m[1] ?? m[2] ?? ""));
          if (keys.length > 0 && keys.every((k) => seen.has(k))) return [];
          return [
            s.replace(QUOTED, (m, a: string | undefined, b: string | undefined) => {
              const k = quoteKey(a ?? b ?? "");
              if (seen.has(k)) return "the same line";
              seen.add(k);
              return m;
            }),
          ];
        })
        .join(" ")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, MAX_EXPLAIN_PARAGRAPHS)
    .join("\n\n");
  if (out.length > MAX_EXPLAIN_CHARS) {
    const head = out.slice(0, MAX_EXPLAIN_CHARS);
    const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "), head.search(/[.!?]$/));
    if (end > 0) {
      out = head.slice(0, end + 1).trim();
    } else {
      const sp = head.lastIndexOf(" ");
      out = `${head.slice(0, sp > 0 ? sp : MAX_EXPLAIN_CHARS).replace(/[,;:\s]+$/, "")}.`;
    }
  }
  return out.trim();
}
