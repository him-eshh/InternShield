// Pre-written explanation + banned-word filter (spec.md > Explain Route).
// Imported by browser code too: no server-only imports here.
import type { ExplainRequest } from "./types";

const BANNED = /\b(safe|safely|safety|legit|legitimate|guaranteed?)\b/i;

export function hasBannedWord(text: string): boolean {
  return BANNED.test(text);
}

function sentenceFor(f: ExplainRequest["flags"][number]): string {
  const s = (f.why || f.title).trim();
  return s.endsWith(".") ? s : `${s}.`;
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
  // Top 3 only and no quotes: the evidence cards right below show every flag with its quote.
  const body = [...new Set(flags.map(sentenceFor))].slice(0, 3);
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

interface ExplanationSection {
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
