"use client";
// The /check flow: form -> checking -> report (or "not a job message"). Cross-route state lives in
// components/shell/AppStateProvider; the last finished check is persisted so a refresh shows the report again.
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
import { btnPrimary, btnSecondary, subhead } from "./ui";

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
            setLines((l) => ({ ...l, [key]: { state, reason, code } }));
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

  const target = outcome?.report && runInput ? reportTarget(outcome, runInput) : null;
  // Gated on the live level: a quick answer that raises the report to high hides Tailor/Practice.
  const liveTarget = target && { company: target.company, role: target.role, description: null };
  const reportExtras = (level: RiskLevel) =>
    target && (TIER_FLAGS.tracker || TIER_FLAGS.resume || TIER_FLAGS.interview) ? (
      <div className="flex flex-wrap items-center justify-center gap-3">
        {TIER_FLAGS.tracker && <SaveToTracker key={reportKey} card={{ ...target, risk: level }} onOpen={() => router.push("/tracker")} />}
        {TIER_FLAGS.resume && level !== "high" && (
          <button type="button" className={btnSecondary} onClick={() => openTool("tailor", liveTarget)}>
            Tailor my resume for this
          </button>
        )}
        {/* No interview coaching on high-risk reports: we don't prep people for a likely scam. */}
        {TIER_FLAGS.interview && level !== "high" && (
          <button type="button" className={btnSecondary} onClick={() => openTool("practice", liveTarget)}>
            Practice an interview for this
          </button>
        )}
      </div>
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
            outcome={outcome}
            input={runInput}
            onRetry={onRetry}
            onAgain={() => {
              setLast(null);
              setScreen("check");
            }}
            extras={reportExtras}
          />
        </div>
      )}
    </div>
  );
}
