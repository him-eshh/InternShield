"use client";
import { useEffect, useRef, useState } from "react";
import { fetchExplanation, type Explanation as ExplanationData, type PipelineInput, type PipelineOutcome, type StepKey } from "@/lib/client/pipeline";
import { FTC_URL } from "@/lib/client/copyReport";
import { describeChange, score } from "@/lib/scoring/score";
import { LEVEL_LABELS, type Answers, type FlagGroup, type QuestionId, type Report as ReportData } from "@/lib/types";
import { ExternalIcon, InfoIcon } from "../icons";
import { btnPrimary, btnSecondary, linkClass } from "../ui";
import CouldntCheck, { COULDNT_CHECK_ID } from "./CouldntCheck";
import EvidenceGroup from "./EvidenceGroup";
import Explanation from "./Explanation";
import PostingSection from "./PostingSection";
import QuickQuestions from "./QuickQuestions";
import RiskRing from "./RiskRing";
import ScamOutcome from "./ScamOutcome";

const GROUPS: FlagGroup[] = ["sender", "message", "offer"];
const RESTING_AFTER_SECONDS = 900; // a retryAfter this long means a daily cap, not a blip

interface Props {
  outcome: PipelineOutcome;
  input: PipelineInput;
  onRetry: () => void;
  onAgain: () => void;
  /** Test/preview hook: the fetch used to re-request the explanation. */
  fetchImpl?: typeof fetch;
}

export function announcement(report: ReportData): string {
  const red = report.flags.filter((f) => f.kind === "red").length;
  return `${LEVEL_LABELS[report.level]}, risk ${report.score}, ${red} red flag${red === 1 ? "" : "s"}`;
}

export default function Report({ outcome, input, onRetry, onAgain, fetchImpl }: Props) {
  const initial = outcome.report as ReportData;
  const [report, setReport] = useState<ReportData>(initial);
  const [questions] = useState(initial.questions);
  const [answers, setAnswers] = useState<Answers>({});
  const [change, setChange] = useState<string | null>(null);
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
    if (!pending) return;
    let live = true;
    void pending.then((ex) => {
      if (live && req.current === 0) setExplanation(ex);
    });
    return () => {
      live = false;
    };
  }, [pending]);

  // Announce the result once it's on screen, and again if a quick question changes it.
  const spoken = announcement(report);
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

  async function onAnswer(id: QuestionId, value: string) {
    const next = { ...answers, [id]: value } as Answers;
    const nextReport = score({ ...outcome.scoreInput, answers: next });
    setAnswers(next);
    setChange(describeChange(report, nextReport));
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
  const careersUrl = steps.company.status === "done" ? (steps.company.data?.careersUrl ?? null) : null;
  const officialDomain = steps.company.status === "done" ? (steps.company.data?.officialDomain ?? null) : null;
  const officialLink = careersUrl
    ? { url: careersUrl, label: "The company's official careers page" }
    : officialDomain
      ? { url: `https://${officialDomain}`, label: `The company's official website (${officialDomain})` }
      : null;
  const postingData =steps.posting.status === "done" ? steps.posting.data : null;
  const companyName = outcome.facts?.company?.value ?? input.form.company;
  const coverage = report.coverage;
  const missing = coverage.missingImportant.length ? ` · couldn't check ${coverage.missingImportant.join(", ")}` : "";
  const quotes = report.flags.map((f) => f.quote).filter((q): q is string => !!q);

  return (
    <article className="mx-auto max-w-[960px] px-6 py-10 sm:py-16">
      <p role="status" aria-live="polite" className="sr-only">{announce}</p>

      <header className="flex flex-col items-center text-center">
        {(input.exampleId || outcome.usedSaved) && (
          <span className="mb-6 rounded-full bg-accent/10 px-3 py-1 text-[13px] font-medium text-accent">
            {outcome.usedSaved ? "Example (saved results)" : "Example"}
          </span>
        )}
        <RiskRing score={report.score} level={report.level} />
        <button
          type="button"
          onClick={jumpToCouldntCheck}
          disabled={report.couldntCheck.length === 0}
          className="mt-4 rounded-full px-3 py-1 text-[14px] text-muted underline-offset-4 enabled:hover:text-text enabled:hover:underline"
        >
          {coverage.ran} of {coverage.total} checks ran{missing}
        </button>
      </header>

      <div className="mx-auto mt-12 max-w-[720px] space-y-10">
        {(canRetry || resting || outcome.limited) && (
          <div role="status" className="flex flex-col items-start gap-4 rounded-[18px] border border-border bg-bg-soft p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-3 text-[15px]">
              <span className="mt-0.5 text-muted"><InfoIcon size={18} /></span>
              {resting
                ? "InternShield is resting for today. The checks that finished are below."
                : cappedSteps.length > 0
                  ? "Some checks are resting for today. You can retry the others."
                  : outcome.limited
                  ? "We're busy right now. Try again in a moment. The checks that finished are below."
                  : "Some checks didn't finish. They're listed under Couldn't check. Retry runs only those."}
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
            There wasn&apos;t much to check in this message. Paste the whole message for a fuller result.
          </p>
        )}

        <QuickQuestions questions={questions} answers={answers} change={change} onAnswer={onAnswer} />

        {explanation ? (
          <Explanation text={explanation.text} quotes={quotes} loading={explaining} />
        ) : (
          pending && <p className="text-[17px] text-muted" aria-busy="true">Writing the explanation...</p>
        )}

        <div className="space-y-10">
          {GROUPS.map((g) => (
            <EvidenceGroup key={g} group={g} flags={report.groups[g]} />
          ))}
        </div>

        <CouldntCheck items={report.couldntCheck} />

        {report.level === "low" ? (
          <PostingSection posting={postingData} match={report.postingMatch} company={companyName} careersUrl={careersUrl} />
        ) : (
          <ScamOutcome report={report} source={answers.source && answers.source !== "unknown" ? answers.source : input.source} careersUrl={careersUrl} />
        )}

        <footer className="flex flex-col items-center gap-5 border-t border-border pt-10 text-center">
          <p className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[15px]">
            {officialLink ? (
              <a href={officialLink.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-1`}>
                {officialLink.label} <ExternalIcon size={14} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <span className="text-muted">Look up the company&apos;s own website to apply or verify.</span>
            )}
            <a href={FTC_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-1`}>
              Report a scam to the FTC <ExternalIcon size={14} />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </p>
          <button type="button" onClick={onAgain} className={btnPrimary}>
            Check another message
          </button>
        </footer>
      </div>
    </article>
  );
}
