"use client";
// / : hero, the three tools, how it works, and "Continue" rows for people who already have state.
import { ArrowRight, CircleAlert, FileCheck2, MessagesSquare, ShieldCheck, TriangleAlert, UserRound, type LucideIcon } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { KEYS, readKey } from "@/lib/client/storage";
import { EXAMPLES } from "@/lib/examples";
import { coverageTicks, topReasons } from "@/lib/reportView";
import { score } from "@/lib/scoring/score";
import { LEVEL_LABELS } from "@/lib/types";
import { CheckIllustration, PracticeIllustration, TailorIllustration } from "../illustrations";
import { useProfileProgress } from "../profile/progress";
import { RingView } from "../report/RiskRing";
import { useAppState } from "../shell/AppStateProvider";
import { useReveal } from "../shell/reveal";
import { btnPrimary, cardInteractive, eyebrow, subhead } from "../ui";

// The hero's mini report is the real engine run on the saved scam example, so it can't drift from the app.
const ex = EXAMPLES.scam;
const sample = score({
  text: ex.text,
  facts: ex.savedSteps.extract.status === "done" ? ex.savedSteps.extract.data : null,
  steps: ex.savedSteps,
  profile: null,
  resumeText: null,
  source: ex.source,
  stage: ex.stage,
  answers: {},
  form: ex.form,
});

const TOOLS = [
  { href: "/check", tool: "check", title: "Check", Icon: ShieldCheck, Art: CheckIllustration, line: "Paste a recruiter message. See which parts are real and which are red flags." },
  { href: "/tailor", tool: "tailor", title: "Tailor", Icon: FileCheck2, Art: TailorIllustration, line: "Match your resume to a job post. You approve each change." },
  { href: "/practice", tool: "practice", title: "Practice", Icon: MessagesSquare, Art: PracticeIllustration, line: "Run a mock interview for a real role and get a scorecard." },
] as const;

const STEPS = [
  ["Add what you have", "A recruiter message, a job post or your resume."],
  ["Get evidence", "Scores come from fixed rules. Every flag quotes your message."],
  ["Act on it", "Tailor the resume, practice the questions, track the application."],
] as const;

const ROUND_NAMES: Record<string, string> = { screen: "Screen", behavioral: "Behavioral", coding: "Coding", design: "Design", case: "Case", finance: "Finance", portfolio: "Portfolio", challenge: "Challenge", debugging: "Debugging", sql: "SQL" };

/** Reads the newest practice session defensively: the interview stream owns its shape. */
function lastPractice(): string | null {
  const list = readKey<unknown>(KEYS.interviews);
  const s = Array.isArray(list) ? (list[0] as { round?: unknown; status?: unknown; config?: { rounds?: unknown } } | undefined) : undefined;
  if (!s) return null;
  const round = typeof s.round === "string" ? ROUND_NAMES[s.round] : undefined;
  const done = s.status === "done";
  return `${round ? `${round} practice` : "Practice session"}${done ? ", finished" : ", in progress"}`;
}

type Row = { href: string; tool: "check" | "tailor" | "practice" | "neutral"; Icon: LucideIcon; title: string; detail: string; risk?: "low" | "medium" | "high" };

export default function Home() {
  const reveal = useReveal();
  const { ready, lastCheck } = useAppState();
  const prog = useProfileProgress();

  const rows: Row[] = [];
  if (ready) {
    const rep = lastCheck?.outcome.report;
    if (rep) {
      const company = lastCheck?.input.form.company?.trim();
      rows.push({ href: "/check", tool: "check", Icon: ShieldCheck, title: company ? `Last check: ${company}` : "Your last check", detail: LEVEL_LABELS[rep.level], risk: rep.level });
    }
    if (readKey(KEYS.tailored)) rows.push({ href: "/tailor", tool: "tailor", Icon: FileCheck2, title: "Resume edits saved", detail: "Pick up where you left off" });
    const p = lastPractice();
    if (p) rows.push({ href: "/practice", tool: "practice", Icon: MessagesSquare, title: "Last practice", detail: p });
    if (prog.count < prog.total) rows.push({ href: "/profile", tool: "neutral", Icon: UserRound, title: "Finish your profile", detail: `${prog.count} of ${prog.total} done` });
  }
  const hasState = rows.length > 0 && (rows.length > 1 || rows[0].href !== "/profile" || prog.count > 0);

  return (
    <div data-tool="neutral">
      <section className="relative overflow-hidden border-b border-border bg-[image:var(--mesh)]">
        <div className="mx-auto grid max-w-[1120px] items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-[1.2fr_1fr] md:py-20">
          <div>
            <p className={eyebrow}>InternShield</p>
            <h1 className="mt-3 font-display text-[clamp(38px,6.4vw,68px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
              Land the internship.<br />Skip the scam.
            </h1>
            <p className="mt-5 max-w-[40ch] text-[clamp(18px,2.2vw,21px)] leading-snug text-fg-2">
              Check a recruiter message, tailor your resume, practice the interview.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3" data-tool="check">
              <Link href="/check" className={`${btnPrimary} max-sm:w-full`}>
                Check a message <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
              </Link>
              <span className="flex flex-wrap gap-x-5 gap-y-1 text-[16px] font-medium">
                <Link href="/tailor" data-tool="tailor" className="inline-flex min-h-11 items-center text-tool-strong underline-offset-4 hover:underline">Tailor my resume</Link>
                <Link href="/practice" data-tool="practice" className="inline-flex min-h-11 items-center text-tool-strong underline-offset-4 hover:underline">Practice interviews</Link>
              </span>
            </div>
          </div>
          <figure aria-label="Example report for a made-up scam message" className="hidden rounded-[22px] border border-border bg-surface p-6 shadow-[var(--shadow-2)] md:block">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-fg-3">Example report</p>
            <div className="mt-3 [&_h2]:text-[26px]">
              <RingView value={sample.score} score={sample.score} level={sample.level} ticks={coverageTicks(sample.coverage)} />
            </div>
            <ul className="mt-4 flex flex-col gap-2 text-[15px]">
              {topReasons(sample.flags).map((f) => (
                <li key={f.id} className="flex gap-3">
                  <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-bad" />
                  <span>{f.title}</span>
                </li>
              ))}
            </ul>
          </figure>
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
        {hasState && (
          <section aria-labelledby="continue-h" className="pt-10">
            <h2 id="continue-h" className={eyebrow}>Continue</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {rows.map((r, i) => (
                <m.li key={r.href} {...reveal(i)} data-tool={r.tool}>
                  <Link href={r.href} className={`${cardInteractive} flex min-h-[72px] items-center gap-3 p-4`}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-tool-tint text-tool-strong">
                      <r.Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{r.title}</span>
                      <span className="flex items-center gap-1.5 truncate text-[14px] text-fg-2">
                        {r.risk === "high" && <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-bad" />}
                        {r.risk === "medium" && <TriangleAlert size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-warn" />}
                        <span className="truncate">{r.detail}</span>
                      </span>
                    </span>
                  </Link>
                </m.li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="tools-h" className="pt-12">
          <h2 id="tools-h" className={subhead}>Three tools, one profile</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {TOOLS.map(({ href, tool, title, Icon, Art, line }, i) => (
              <m.li key={href} {...reveal(i + 1)} data-tool={tool}>
                <Link href={href} className={`${cardInteractive} group flex h-full flex-col overflow-hidden`}>
                  <span className="grid place-items-center bg-tool-tint px-4 py-5">
                    <Art size={176} />
                  </span>
                  <span className="flex flex-1 flex-col p-5">
                    <span className="flex items-center gap-2 text-tool-strong">
                      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                      <span className="font-display text-[22px] font-bold">{title}</span>
                    </span>
                    <span className="mt-2 flex-1 text-[16px] text-fg-2">{line}</span>
                    <span className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-tool-strong">
                      Start <ArrowRight size={18} strokeWidth={2} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>
              </m.li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how-h" className="py-14">
          <h2 id="how-h" className={eyebrow}>How it works</h2>
          <ol className="mt-4 grid gap-6 sm:grid-cols-3">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span aria-hidden="true" className="num grid size-9 shrink-0 place-items-center rounded-full bg-ink text-[15px] font-semibold text-[var(--on-ink)]">{i + 1}</span>
                <span>
                  <span className="block font-display text-[18px] font-bold">{t}</span>
                  <span className="mt-1 block text-[15px] text-fg-2">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
