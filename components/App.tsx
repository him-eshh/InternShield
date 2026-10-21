"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { EXAMPLES } from "@/lib/examples";
import { fallbackExplanation } from "@/lib/explainFallback";
import {
  retryableSteps,
  runPipeline,
  type LineState,
  type PipelineInput,
  type PipelineOutcome,
  type StepKey,
} from "@/lib/client/pipeline";
import { clearMyData, loadProfile, loadResume } from "@/lib/client/storage";
import type { Profile, ResumeData, StepResult, StepResults } from "@/lib/types";
import CheckForm, { type CheckSubmit } from "./CheckForm";
import Checklist, { initialLines, type LineInfo } from "./Checklist";
import Intro from "./Intro";
import Logo from "./Logo";
import ProfileChip from "./ProfileChip";
import ProfileSteps from "./ProfileSteps";
import ThemeToggle from "./ThemeToggle";
import Report from "./report/Report";
import { btnPrimary, subhead } from "./ui";

type Screen = "loading" | "intro" | "profile" | "check" | "checking" | "report" | "notjob";

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

/** Dev-only: `?fixture=scam|real|medium` renders a hand-written report so the UI can be checked without the network. */
async function fixtureOutcome(name: string): Promise<{ outcome: PipelineOutcome; input: PipelineInput } | null> {
  const { scamReport, realReport, mediumReport } = await import("@/fixtures/reports");
  const report = name === "real" ? realReport : name === "medium" ? mediumReport : name === "scam" ? scamReport : null;
  if (!report) return null;
  const ex = name === "real" ? EXAMPLES.real : EXAMPLES.scam;
  const steps: StepResults =
    name === "medium"
      ? {
          extract: ex.savedSteps.extract,
          company: { status: "failed", reason: "timeout" },
          sender: { status: "failed", reason: "limit", retryAfter: 20 },
          posting: { status: "skipped", reason: "needs step 2" },
        }
      : ex.savedSteps;
  const input: PipelineInput = { text: ex.text, form: ex.form, source: ex.source, stage: ex.stage, profile: null, resumeText: null, exampleId: null };
  const facts = steps.extract.status === "done" ? steps.extract.data : null;
  const outcome: PipelineOutcome = {
    notJob: false,
    steps,
    facts,
    scoreInput: { text: ex.text, facts, steps, profile: null, resumeText: null, source: ex.source, stage: ex.stage, answers: {}, form: ex.form },
    report,
    explanation: {
      text: fallbackExplanation({ level: report.level, flags: report.flags.slice(0, 6).map((f) => ({ title: f.title, quote: f.quote, why: f.why })) }),
      source: "fallback",
    },
    pendingExplanation: null,
    usedSaved: false,
    retryable: retryableSteps(steps),
    retryAfter: name === "medium" ? 20 : null,
    limited: name === "medium",
  };
  return { outcome, input };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [lines, setLines] = useState<Record<StepKey, LineInfo>>(initialLines);
  const [outcome, setOutcome] = useState<PipelineOutcome | null>(null);
  const [runInput, setRunInput] = useState<PipelineInput | null>(null);
  const [last, setLast] = useState<CheckSubmit | null>(null);
  const [isExample, setIsExample] = useState(false);
  const [reportKey, setReportKey] = useState(0);
  const runId = useRef(0);

  useEffect(() => {
    const p = loadProfile();
    /* eslint-disable react-hooks/set-state-in-effect -- read browser storage once after mount (SSR has none) */
    setProfile(p);
    setResume(loadResume());
    setScreen(p ? "check" : "intro");
    /* eslint-enable react-hooks/set-state-in-effect */

    if (process.env.NODE_ENV !== "production") {
      const fx = new URLSearchParams(window.location.search).get("fixture");
      if (fx) {
        void fixtureOutcome(fx).then((r) => {
          if (!r) return;
          setOutcome(r.outcome);
          setRunInput(r.input);
          setReportKey((k) => k + 1);
          setScreen("report");
        });
      }
    }
  }, []);

  const execute = useCallback(async (input: PipelineInput, prev?: StepResults) => {
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
          setLines((l) => ({ ...l, [key]: { state, reason } }));
        },
      },
      prev,
    );
    if (id !== runId.current) return;
    setOutcome(result);
    setReportKey((k) => k + 1);
    setScreen(result.notJob ? "notjob" : "report");
  }, []);

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
    void execute(input);
  }

  function onRetry() {
    if (runInput && outcome) void execute(runInput, outcome.steps);
  }

  function onClear() {
    runId.current++;
    clearMyData();
    setProfile(null);
    setResume(null);
    setLast(null);
    setOutcome(null);
    setScreen("intro");
  }

  // Move focus to the new screen's heading after each screen change (not on first load).
  const mainRef = useRef<HTMLElement>(null);
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

  const showChip = profile && (screen === "check" || screen === "report" || screen === "notjob");

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[960px] items-center justify-between gap-3 px-6 pt-6">
        <Logo />
        <div className="flex items-center gap-2">
          {showChip && <ProfileChip profile={profile} onEdit={() => setScreen("profile")} onClear={onClear} />}
          <ThemeToggle />
        </div>
      </header>
      <main ref={mainRef} key={screen === "loading" ? "loading" : `${screen}-${reportKey}`} className={screen === "loading" ? "" : "animate-enter"}>
        {screen === "intro" && <Intro onStart={() => setScreen("profile")} />}
        {screen === "profile" && (
          <ProfileSteps
            initial={profile}
            initialResume={resume}
            onCancel={profile ? () => setScreen("check") : () => setScreen("intro")}
            onDone={(p, r) => {
              setProfile(p);
              setResume(r);
              setScreen("check");
            }}
          />
        )}
        {screen === "check" && <CheckForm initial={last} onSubmit={onCheck} />}
        {screen === "checking" && <Checklist lines={lines} example={isExample} />}
        {screen === "notjob" && <NotJob onBack={() => setScreen("check")} />}
        {screen === "report" && outcome?.report && runInput && (
          <Report outcome={outcome} input={runInput} onRetry={onRetry} onAgain={() => { setLast(null); setScreen("check"); }} />
        )}
      </main>
    </div>
  );
}
