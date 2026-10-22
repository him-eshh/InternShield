"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import "@/app/v2-check.css";
import { fetchExplanation, rerunWithCompany, type Explanation as ExplanationData, type PipelineInput, type PipelineOutcome, type StepKey } from "@/lib/client/pipeline";
import { actionLine } from "@/lib/reportView";
import { describeChange, score } from "@/lib/scoring/score";
import { LEVEL_LABELS, type Answers, type QuestionId, type Report as ReportData } from "@/lib/types";
import { InfoIcon } from "../icons";
import { btnSecondary } from "../ui";
import CompanyChip from "./CompanyChip";
import CouldntCheck, { COULDNT_CHECK_ID } from "./CouldntCheck";
import EvidenceList from "./EvidenceList";
import Explanation from "./Explanation";
import PostingSection from "./PostingSection";
import QuickQuestions, { type AnswerValue } from "./QuickQuestions";
import RecoveryCard from "./RecoveryCard";
import ReportFooter from "./ReportFooter";
import RiskRing from "./RiskRing";
import TopReasons from "./TopReasons";

const RESTING_AFTER_SECONDS = 900; // a retryAfter this long means a daily cap, not a blip

interface Props {
  outcome: PipelineOutcome;
  input: PipelineInput;
  onRetry: () => void;
  onAgain: () => void;
  /** Test/preview hook: the fetch used to re-request the explanation. */
  fetchImpl?: typeof fetch;
  /** Optional extra actions, shown in the footer's secondary row. */
  extras?: ReactNode;
  /** Slot for the recovery card ("Already sent money or shared info?"), shown after the quick questions. */
  recovery?: ReactNode;
}

export function announcement(report: ReportData): string {
  const red = report.flags.filter((f) => f.kind === "red").length;
  return `${LEVEL_LABELS[report.level]}, risk ${report.score}, ${red} red flag${red === 1 ? "" : "s"}`;
}

/**
 * The report App renders. Editing the company re-runs only the company + posting lookups and swaps in
 * the new outcome here (App.tsx is frozen), remounting the body so its state starts from the new report.
 */
export default function Report(props: Props) {
  const [base, setBase] = useState(props.outcome);
  const [rerun, setRerun] = useState<{ outcome: PipelineOutcome; input: PipelineInput; n: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [kept, setKept] = useState<Answers>({}); // quick answers survive a company recheck
  if (base !== props.outcome) {
    setBase(props.outcome);
    setRerun(null);
    setNote(null);
    setKept({});
  }
  const outcome = rerun?.outcome ?? props.outcome;
  const input = rerun?.input ?? props.input;

  async function onCompany(name: string) {
    setBusy(true);
    setNote(null);
    const nextInput = { ...input, form: { ...input.form, company: name } };
    const next = await rerunWithCompany(input, outcome.steps, name, { fetch: props.fetchImpl });
    setRerun((r) => ({ outcome: next, input: nextInput, n: (r?.n ?? 0) + 1 }));
    setBusy(false);
    setNote(`Rechecked with ${name}`);
  }

  // The body remounts after a recheck; put focus back on the chip (after commit) so keyboard users stay in place.
  const reruns = rerun?.n ?? 0;
  useEffect(() => {
    if (reruns) document.querySelector<HTMLElement>("[data-company-edit]")?.focus();
  }, [reruns]);

  if (!outcome.report) return null;
  return (
    <ReportBody
      key={rerun?.n ?? 0}
      {...props}
      outcome={outcome}
      input={input}
      company={{ busy, note, onSave: (n) => void onCompany(n) }}
      kept={kept}
      onAnswers={setKept}
    />
  );
}

interface BodyProps extends Props {
  company?: { busy: boolean; note: string | null; onSave: (name: string) => void };
  /** Answers given before a company recheck; the remounted body re-scores with them. */
  kept?: Answers;
  onAnswers?: (a: Answers) => void;
}

function ReportBody({ outcome, input, onRetry, onAgain, fetchImpl, extras, recovery, company, kept, onAnswers }: BodyProps) {
  const fresh = outcome.report as ReportData;
  const [answers, setAnswers] = useState<Answers>(kept ?? {});
  const [initial] = useState<ReportData>(() => (Object.keys(answers).length ? score({ ...outcome.scoreInput, answers }) : fresh));
  const [report, setReport] = useState<ReportData>(initial);
  const [questions] = useState(fresh.questions);
  // Kept answers that moved the level make the rechecked explanation stale: fetch one for this report.
  const [stale] = useState(initial.level !== fresh.level);
  const [change, setChange] = useState<string | null>(null);
  const [lastId, setLastId] = useState<QuestionId | null>(null);
  const [explanation, setExplanation] = useState<ExplanationData | null>(outcome.explanation);
  const [explaining, setExplaining] = useState(false);
  const [announce, setAnnounce] = useState("");
  // Per step: a limited step with a long retryAfter hit a daily cap; the others can still be retried.
  const limitOf = (k: StepKey) => {
    const r = k === "explain" ? null : outcome.steps[k];
    return r && r.status === "failed" && r.reason === "limit" ? (r.retryAfter ?? 0) : null;
  };
  const cappedSteps = outcome.retryable.filter((k) => (limitOf(k) ?? 0) >= RESTING_AFTER_SECONDS);
  const openSteps = outcome.retryable.filter((k) => !cappedSteps.includes(k));
  const canRetry = openSteps.length > 0;
  const resting = cappedSteps.length > 0 && !canRetry;
  const [wait, setWait] = useState(Math.max(0, ...openSteps.map((k) => limitOf(k) ?? 0)));
  const req = useRef(0);

  // The explanation arrives after the report; fill it in when it does.
  const pending = outcome.pendingExplanation;
  useEffect(() => {
    const p = stale ? fetchExplanation(initial, { fetch: fetchImpl }) : pending;
    if (!p) return;
    let live = true;
    void p.then((ex) => {
      if (live && req.current === 0) setExplanation(ex);
    });
    return () => {
      live = false;
    };
  }, [pending, stale, initial, fetchImpl]);

  // Announce the result once it's on screen. After an answer, only when the level moved:
  // the ring announces the score change itself.
  const spoken = Object.keys(answers).length === 0 || report.level !== initial.level ? announcement(report) : "";
  useEffect(() => {
    const id = setTimeout(() => setAnnounce(spoken), 400);
    return () => clearTimeout(id);
  }, [spoken]);

  const counting = wait > 0;
  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => clearInterval(id);
  }, [counting]);

  async function onAnswer(id: QuestionId, value: AnswerValue) {
    const next = { ...answers, [id]: value } as Answers;
    const nextReport = score({ ...outcome.scoreInput, answers: next });
    setAnswers(next);
    onAnswers?.(next);
    setChange(describeChange(report, nextReport));
    setLastId(id);
    const levelChanged = nextReport.level !== report.level;
    setReport(nextReport);
    const mine = ++req.current; // every answer invalidates any in-flight explanation
    if (levelChanged) {
      setExplaining(true);
      const ex = await fetchExplanation(nextReport, { fetch: fetchImpl });
      if (mine === req.current) {
        setExplanation(ex);
        setExplaining(false);
      }
    } else {
      setExplaining(false);
    }
  }

  function jumpToCouldntCheck() {
    const el = document.getElementById(COULDNT_CHECK_ID) as HTMLDetailsElement | null;
    if (!el) return;
    el.open = true;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
    el.querySelector("summary")?.focus({ preventScroll: true });
  }

  const { steps } = outcome;
  const incomplete = steps.extract.status !== "done";
  const careersUrl = steps.company.status === "done" ? (steps.company.data?.careersUrl ?? null) : null;
  const officialDomain = steps.company.status === "done" ? (steps.company.data?.officialDomain ?? null) : null;
  const officialLink = careersUrl
    ? { url: careersUrl, label: "Official careers page" }
    : officialDomain
      ? { url: `https://${officialDomain}`, label: "Official website" }
      : null;
  const postingData = steps.posting.status === "done" ? steps.posting.data : null;
  const companyName = outcome.facts?.company?.value ?? input.form.company;
  const coverage = report.coverage;
  const missing = coverage.missingImportant.length ? ` · couldn't check ${coverage.missingImportant.join(", ")}` : "";
  const quotes = report.flags.map((f) => f.quote).filter((q): q is string => !!q);
  // Never add questions after the first render; drop the ones that stopped mattering (answered ones stay).
  const shownQuestions = questions.filter((q) => answers[q.id] !== undefined || report.questions.some((x) => x.id === q.id));
  const channel = answers.channel && answers.channel !== "other" ? answers.channel : null;

  return (
    <article className="mx-auto max-w-[960px] px-6 py-10 sm:py-16">
      <p role="status" aria-live="polite" className="sr-only">{announce}</p>

      <header className="flex flex-col items-center text-center">
        {(input.exampleId || outcome.usedSaved) && (
          <span className="mb-6 rounded-full bg-accent/10 px-3 py-1 text-[13px] font-medium text-accent-fg">
            {outcome.usedSaved ? "Example (saved)" : "Example"}
          </span>
        )}
        <RiskRing score={report.score} level={report.level} coverage={report.coverage} />
        <p className="mt-3 max-w-[46ch] text-[17px] leading-snug text-fg-2">{actionLine(report.level)}</p>
        {report.questionHint && shownQuestions.some((q) => answers[q.id] === undefined) && (
          <p className="mt-2 text-[14px] text-muted">{report.questionHint}</p>
        )}
        {company && !incomplete && <CompanyChip name={companyName} busy={company.busy} note={company.note} onSave={company.onSave} />}
        <button
          type="button"
          onClick={jumpToCouldntCheck}
          disabled={report.couldntCheck.length === 0}
          className="mt-3 rounded-full px-3 py-1 text-[14px] text-muted underline-offset-4 enabled:hover:text-text enabled:hover:underline"
        >
          {coverage.ran} of {coverage.total} checks ran{missing}
        </button>
      </header>

      <div className="mx-auto mt-12 max-w-[720px] space-y-10">
        {(canRetry || resting || outcome.limited || incomplete) && (
          <div role="status" className="flex flex-col items-start gap-4 rounded-[18px] border border-border bg-bg-soft p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-3 text-[15px]">
              <span className="mt-0.5 text-muted"><InfoIcon size={18} /></span>
              {resting
                ? "InternShield is resting for today."
                : cappedSteps.length > 0
                  ? "Some checks are resting for today."
                  : outcome.limited
                    ? "We're busy. Try again in a moment."
                    : incomplete
                      ? null
                      : "Some checks didn't finish."}
              {incomplete && `${resting || cappedSteps.length > 0 || outcome.limited ? " " : ""}We couldn't read the message, so this result is incomplete.`}
            </p>
            {canRetry && (
              <button type="button" onClick={onRetry} disabled={wait > 0} className={`${btnSecondary} !min-h-10 !px-5 !py-2 !text-[15px]`}>
                {wait > 0 ? `Retry in ${wait}s` : "Retry"}
              </button>
            )}
          </div>
        )}

        {report.thinMessage && (
          <p className="rounded-[18px] border border-border bg-bg-soft p-5 text-[15px] text-muted">
            Not much to check here. Paste the whole message for a fuller result.
          </p>
        )}

        <TopReasons flags={report.flags} />

        {explanation ? (
          <Explanation text={explanation.text} source={explanation.source} quotes={quotes} loading={explaining} />
        ) : (
          pending && <p className="text-[17px] text-muted" aria-busy="true">Writing the explanation...</p>
        )}

        <EvidenceList flags={report.flags} level={report.level} />

        <CouldntCheck items={report.couldntCheck} />

        <QuickQuestions questions={shownQuestions} answers={answers} change={change} lastId={lastId} onAnswer={onAnswer} />

        {recovery ?? <RecoveryCard level={report.level} />}

        {report.level !== "high" && (
          <PostingSection checked={steps.posting.status === "done"} posting={postingData} match={report.postingMatch} company={companyName} careersUrl={careersUrl} />
        )}

        <ReportFooter
          report={report}
          careersUrl={careersUrl}
          officialLink={officialLink}
          source={channel ?? input.source}
          onAgain={onAgain}
          extras={extras}
        />
      </div>
    </article>
  );
}
