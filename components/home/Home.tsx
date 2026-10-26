"use client";
// The made-up recruiter note gives the homepage the same evidence vocabulary as Check.
import { ArrowRight, CircleAlert, FileCheck2, MessagesSquare, ShieldCheck, TriangleAlert, UserRound, type LucideIcon } from "lucide-react";
import * as m from "motion/react-m";
import Link from "next/link";
import { loadActive, loadHistory, practiceContinue } from "@/lib/tiers/session";
import { LEVEL_LABELS } from "@/lib/types";
import { useProfileProgress } from "../profile/progress";
import { useAppState } from "../shell/AppStateProvider";
import { useReveal } from "../shell/reveal";
import { btnPrimary, cardInteractive } from "../ui";

const TOOLS = [
  { href: "/check", tool: "check", title: "Check a message", Icon: ShieldCheck, line: "See the quoted signs, missing checks, and your next move.", preview: "Evidence before a verdict" },
  { href: "/tailor", tool: "tailor", title: "Tailor a resume", Icon: FileCheck2, line: "Compare suggested lines with your own experience. You decide what stays.", preview: "Every edit needs your approval" },
  { href: "/practice", tool: "practice", title: "Practice an interview", Icon: MessagesSquare, line: "Answer, run code or SQL, and see the checks behind your feedback.", preview: "Answers turn into a next drill" },
] as const;

type ContinueRow = { href: string; tool: "check" | "practice" | "neutral"; Icon: LucideIcon; title: string; detail: string; risk?: "low" | "medium" | "high" };

export default function Home() {
  const reveal = useReveal();
  const { ready, lastCheck } = useAppState();
  const progress = useProfileProgress();
  const rows: ContinueRow[] = [];
  if (ready) {
    const report = lastCheck?.outcome.report;
    if (report) rows.push({ href: "/check", tool: "check", Icon: ShieldCheck, title: lastCheck?.input.form.company?.trim() ? `Last check: ${lastCheck.input.form.company.trim()}` : "Your last check", detail: LEVEL_LABELS[report.level], risk: report.level });
    const practice = practiceContinue(loadActive(), loadHistory());
    if (practice) rows.push({ href: practice.resume ? "/practice?resume=1" : "/practice", tool: "practice", Icon: MessagesSquare, title: practice.title, detail: practice.detail });
    if (progress.count < progress.total) rows.push({ href: "/profile", tool: "neutral", Icon: UserRound, title: "Finish your profile", detail: `${progress.count} of ${progress.total} steps done` });
  }
  const hasState = rows.length > 0 && (rows.length > 1 || rows[0].href !== "/profile" || progress.count > 0);

  return <div data-tool="neutral">
    <section className="border-b border-rule bg-[image:var(--mesh)]"><div className="mx-auto grid max-w-[1200px] items-start gap-10 px-4 py-10 sm:px-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-14 md:py-14">
      <div className="min-w-0"><h1 className="max-w-[14ch] font-display text-display font-extrabold">Know the signs.<br />Make your move.</h1>
        <p className="mt-7 max-w-[44ch] text-[19px] leading-relaxed text-fg-2">A recruiter message can look polished and still leave questions. Check the evidence, then prepare for opportunities worth pursuing.</p>
        <div data-tool="check" className="mt-8 flex flex-wrap items-center gap-4"><Link href="/check" className={`${btnPrimary} group`}>Check a message <ArrowRight size={19} strokeWidth={1.75} aria-hidden="true" className="transition-transform duration-150 motion-safe:group-hover:translate-x-[3px]" /></Link><p className="max-w-[24ch] text-sm text-fg-2">Paste text or upload a screenshot. Review what was read before checking.</p></div>
      </div>
      <figure data-tool="check" className="relative min-w-0 border-l-4 border-coral bg-paper-2 p-5 sm:p-7" aria-label="Made-up recruiter message with three annotated scam signs">
        <figcaption className="mb-4 flex items-center justify-between gap-2 border-b border-rule pb-3 text-sm font-semibold"><span>Message under review</span><span className="font-mono text-xs font-normal text-fg-2">Made-up example</span></figcaption>
        <p className="font-mono text-xs text-fg-2">From: internships@northbeam-careers.example</p>
        <blockquote className="mt-4 max-w-[45ch] font-mono text-[15px] leading-[1.8]">We found your profile and can offer you a remote internship. <mark className="hero-mark bg-transparent text-inherit">Move the interview to Telegram<sup>1</sup></mark> so we can get started. <mark className="hero-mark bg-transparent text-inherit">Reply within two hours<sup>2</sup></mark>. Before your first day, <mark className="hero-mark bg-transparent text-inherit">pay a refundable equipment fee<sup>3</sup></mark>.</blockquote>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 300 18" preserveAspectRatio="none" className="mt-4 h-4 w-full text-coral-strong"><path d="M2 8 Q80 3 154 9 T298 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="7 5" /></svg>
        <ol className="mt-2 space-y-2 text-sm" aria-label="Notes on the example">
          <li className="flex items-start gap-3 border border-dashed border-coral-strong/50 bg-paper px-3 py-2"><span className="grid size-7 shrink-0 place-items-center bg-tool-deep font-mono text-xs font-bold text-on-deep">1</span><span>Interview moved off the usual channel</span></li>
          <li className="ml-2 flex items-start gap-3 border border-dashed border-coral-strong/50 bg-paper px-3 py-2"><span className="grid size-7 shrink-0 place-items-center bg-tool-deep font-mono text-xs font-bold text-on-deep">2</span><span>Pressure to answer quickly</span></li>
          <li className="flex items-start gap-3 border border-dashed border-coral-strong/50 bg-paper px-3 py-2"><span className="grid size-7 shrink-0 place-items-center bg-tool-deep font-mono text-xs font-bold text-on-deep">3</span><span>Money requested before work begins</span></li>
        </ol>
      </figure>
    </div></section>
    <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6"><ul aria-label="Tools" className="grid gap-3 md:grid-cols-3">{TOOLS.map(({ href, tool, title, Icon, line }, i) => <m.li key={href} {...reveal(i)} data-tool={tool}><Link href={href} className="group flex h-full gap-3 rounded-[var(--radius-md)] border border-border border-t-4 border-t-tool bg-surface p-4 shadow-[var(--shadow-1)] transition-[box-shadow,transform] duration-150 hover:shadow-[var(--shadow-2)] motion-safe:hover:-translate-y-0.5"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-tool-tint text-tool-strong"><Icon size={21} strokeWidth={1.75} /></span><span className="min-w-0"><span className="flex items-center gap-1 font-display text-lg font-bold">{title}<ArrowRight size={16} aria-hidden="true" className="text-tool-strong transition-transform duration-150 motion-safe:group-hover:translate-x-[3px]" /></span><span className="mt-1 block text-sm text-fg-2">{line}</span></span></Link></m.li>)}</ul>
      {ready && progress.count === 0 && <Link href="/profile" data-tool="neutral" className={`${cardInteractive} mt-3 flex items-center gap-3 p-4`}><UserRound size={21} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-tool-strong" /><span className="min-w-0"><span className="block font-semibold">Set up your profile (2 min, optional)</span><span className="block text-sm text-fg-2">Your notes make Tailor and Practice specific to you. They stay on this device.</span></span><ArrowRight size={17} aria-hidden="true" className="ml-auto shrink-0 text-tool-strong" /></Link>}
    </div>
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
      {hasState && <section aria-labelledby="continue-h" className="pt-10"><h2 id="continue-h" className="font-display text-2xl">Pick up where you left off</h2><ul className="mt-4 grid gap-3 md:grid-cols-3">{rows.map((row, i) => <m.li key={row.href} {...reveal(i)} data-tool={row.tool}><Link href={row.href} className={`${cardInteractive} flex min-h-20 items-center gap-3 p-4`}><row.Icon size={21} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-tool-strong" /><span className="min-w-0"><span className="block break-words font-semibold">{row.title}</span><span className="flex items-center gap-1.5 text-sm text-fg-2">{row.risk === "high" && <CircleAlert size={15} className="text-bad" aria-hidden="true" />}{row.risk === "medium" && <TriangleAlert size={15} className="text-warn" aria-hidden="true" />}{row.detail}</span></span><ArrowRight size={17} aria-hidden="true" className="ml-auto shrink-0 text-tool-strong" /></Link></m.li>)}</ul></section>}
      <section aria-labelledby="how-h" className="border-t border-rule py-12 sm:py-16"><h2 id="how-h" className="font-display text-2xl">From a message to a decision</h2><p className="mt-3 max-w-[60ch] text-fg-2">Paste what you received. InternShield marks the evidence and what it could not verify. You decide whether to stop, confirm through an official channel, or prepare for the interview.</p><div aria-hidden="true" className="mt-7 h-1 max-w-2xl rounded-full bg-ink-tint"><span className="block h-full w-1/3 rounded-full bg-coral" /></div></section>
    </div>
  </div>;
}
