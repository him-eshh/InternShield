"use client";
// The /check flow: form -> checking -> report (or "not a job message"). Cross-route state lives in
// components/shell/AppStateProvider; the last finished check is persisted so a refresh shows the report again.
import { ArrowRight, FilePen, MessagesSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  runPipeline,
  type LineState,
  type PipelineInput,
  type PipelineOutcome,
  type StepKey,
} from "@/lib/client/pipeline";
import type { RiskLevel, StepResult, StepResults } from "@/lib/types";
import { TIER_FLAGS } from "@/lib/tiers/flags";
import type { NewCard, PostingContext } from "@/lib/tiers/types";
import SaveToTracker from "./tiers/SaveToTracker";
import CheckForm, { type CheckSubmit } from "./CheckForm";
import Checklist, { initialLines, type LineInfo } from "./Checklist";
import Report from "./report/Report";
import { useAppState } from "./shell/AppStateProvider";
import { btnPrimary, subhead } from "./ui";

const nextStep =
  "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-tool bg-tool-tint px-5 py-3 text-[16px] font-semibold text-tool-strong transition-[background-color,transform] duration-200 ease-out hover:bg-surface active:scale-[0.98] sm:max-w-[300px]";

type Screen = "loading" | "check" | "checking" | "report" | "notjob";

/** Company/role/link the last report found: feeds "Save to tracker" and resume tailoring. Empty string = not known (Save asks). */
function reportTarget(outcome: PipelineOutcome, input: PipelineInput): NewCard {
  const posting = outcome.steps.posting.status === "done" ? outcome.steps.posting.data : null;
  return {
    company: outcome.facts?.company?.value?.trim() || input.form.company?.trim() || "",
    role: outcome.facts?.role?.value?.trim() || posting?.title?.trim() || "",
    link: posting?.found && posting.onOfficialDomain ? posting.url : null,
    risk: outcome.report?.level ?? null,
  };
}

function NotJob({ onBack }: { onBack: () => void }) {
  return (
    <section className="mx-auto max-w-[640px] px-6 py-16 text-center sm:py-24">
      <h2 className={subhead}>This doesn&apos;t look like a job message</h2>
      <p className="mx-auto mt-5 max-w-[40ch] text-[19px] text-muted">
        Paste the full message from the recruiter, including who it&apos;s from, and we&apos;ll take a look.
      </p>
      <div className="mt-10">
        <button type="button" className={btnPrimary} onClick={onBack}>
          Try again
        </button>
      </div>
    </section>
  );
}

export default function App() {
  const router = useRouter();
  const { ready, profile, resume, lastCheck, setLastCheck, setTarget } = useAppState();
  const [screen, setScreen] = useState<Screen>("loading");
  const [lines, setLines] = useState<Record<StepKey, LineInfo>>(initialLines);
  const [outcome, setOutcome] = useState<PipelineOutcome | null>(null);
  const [runInput, setRunInput] = useState<PipelineInput | null>(null);
  const [last, setLast] = useState<CheckSubmit | null>(null);
  const [isExample, setIsExample] = useState(false);
  const [reportKey, setReportKey] = useState(0);
  const runId = useRef(0);

  // Once storage is read: reopen the last finished check (refresh, back from another tool), else the form.
  const restored = useRef(false);
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    /* eslint-disable react-hooks/set-state-in-effect -- restore persisted state once after mount (SSR has none) */
    if (lastCheck?.outcome.report) {
      setOutcome(lastCheck.outcome);
      setRunInput(lastCheck.input);
      setLast(lastCheck.submit);
      setScreen("report");
    } else setScreen("check");
    /* eslint-enable react-hooks/set-state-in-effect */

    if (process.env.NODE_ENV !== "production") {
      const fx = new URLSearchParams(window.location.search).get("fixture");
      if (fx) {
        void import("@/fixtures/outcome").then(({ fixtureOutcome }) => fixtureOutcome(fx)).then((r) => {
          if (!r) return;
          setOutcome(r.outcome);
          setRunInput(r.input);
          setReportKey((k) => k + 1);
          setScreen("report");
          setLastCheck({ ...r, submit: null }); // QA seeds a finished check this way (qa/v3-lib.mjs seedCheck)
        });
      }
    }
  }, [ready, lastCheck, setLastCheck]);

  const execute = useCallback(
    async (input: PipelineInput, submit: CheckSubmit | null, prev?: StepResults) => {
      const id = ++runId.current;
      setIsExample(!!input.exampleId);
      setLines(initialLines());
      setScreen("checking");
      const result = await runPipeline(
        input,
        {
          onLine: (key: StepKey, state: LineState, r?: StepResult<unknown>) => {
            if (id !== runId.current) return;
            const reason = r && r.status !== "done" ? r.reason : undefined;
            const code = r && r.status === "failed" ? r.code : undefined;
            const data = r?.status === "done" ? r.data as Record<string, unknown> : null;
            const outcome = data ? key === "extract" ? "Message read" : key === "company"
              ? data.officialDomain ? `Company site: ${data.officialDomain}` : "No official company site found"
              : key === "sender" ? "Sender domain checked" : key === "posting"
                ? data.found ? "Job posting found" : "No matching posting found" : "Explanation ready" : undefined;
            setLines((l) => ({ ...l, [key]: { state, reason, code, outcome } }));
          },
        },
        prev,
      );
      if (id !== runId.current) return;
      setOutcome(result);
      setReportKey((k) => k + 1);
      setScreen(result.notJob ? "notjob" : "report");
      if (result.report) setLastCheck({ outcome: result, input, submit });
    },
    [setLastCheck],
  );

  function onCheck(s: CheckSubmit) {
    setLast(s);
    const input: PipelineInput = {
      text: s.text,
      form: s.form,
      source: s.source,
      stage: s.stage,
      profile,
      resumeText: resume?.text ?? null,
      exampleId: s.exampleId,
    };
    setRunInput(input);
    void execute(input, s);
  }

  function onRetry() {
    if (runInput && outcome) void execute(runInput, last, outcome.steps);
  }

  // Move focus to the new screen's heading after each screen change (not on first load).
  const mainRef = useRef<HTMLDivElement>(null);
  const firstScreen = useRef(true);
  useEffect(() => {
    if (screen === "loading") return;
    if (firstScreen.current) {
      firstScreen.current = false;
      return;
    }
    const h = mainRef.current?.querySelector<HTMLElement>("h1, h2");
    if (h) {
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
  }, [screen, reportKey]);

  const openTool = (tool: "tailor" | "practice", t: PostingContext | null) => {
    setTarget(tool, t);
    router.push(`/${tool}`);
  };

  const persistReport = useCallback((updated: PipelineOutcome, updatedInput: PipelineInput) => {
    setLastCheck({ outcome: updated, input: updatedInput, submit: last });
  }, [setLastCheck, last]);
  const currentCheck = lastCheck ?? (outcome && runInput ? { outcome, input: runInput } : null);
  const target = currentCheck?.outcome.report ? reportTarget(currentCheck.outcome, currentCheck.input) : null;
  // Gated on the live level: a quick answer that raises the report to high hides Tailor/Practice.
  const liveTarget = target && { company: target.company, role: target.role, description: null };
  const reportExtras = (level: RiskLevel) =>
    target && TIER_FLAGS.tracker ? <SaveToTracker key={reportKey} card={{ ...target, risk: level }} onOpen={() => router.push("/tracker")} /> : null;
  // Next steps wear their own tool colors (data-tool on the button), never the Check coral or a risk color.
  const nextSteps = (level: RiskLevel) =>
    target && level !== "high" && (TIER_FLAGS.resume || TIER_FLAGS.interview) ? (
      <>
        {TIER_FLAGS.resume && (
          <button type="button" data-tool="tailor" className={nextStep} onClick={() => openTool("tailor", liveTarget)}>
            <FilePen size={18} aria-hidden="true" />
            Tailor my resume for this
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
        {/* No interview coaching on high-risk reports: we don't prep people for a likely scam. */}
        {TIER_FLAGS.interview && (
          <button type="button" data-tool="practice" className={nextStep} onClick={() => openTool("practice", liveTarget)}>
            <MessagesSquare size={18} aria-hidden="true" />
            Practice an interview for this
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </>
    ) : null;

  return (
    <div ref={mainRef} key={screen === "loading" ? "loading" : `${screen}-${reportKey}`} className={screen === "loading" ? "" : "animate-enter"}>
      {screen === "check" && <CheckForm initial={last} onSubmit={onCheck} />}
      {screen === "checking" && <Checklist lines={lines} example={isExample} />}
      {screen === "notjob" && <NotJob onBack={() => setScreen("check")} />}
      {/* Report chrome stays neutral (not coral) so risk red never sits next to the Check accent. */}
      {screen === "report" && outcome?.report && runInput && (
        <div data-tool="neutral">
          <Report
            onPersist={persistReport}
            outcome={outcome}
            input={runInput}
            onRetry={onRetry}
            onAgain={() => {
              setLast(null);
              setScreen("check");
            }}
            extras={reportExtras}
            nextSteps={nextSteps}
          />
        </div>
      )}
    </div>
  );
}
