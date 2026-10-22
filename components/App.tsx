"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  runPipeline,
  type LineState,
  type PipelineInput,
  type PipelineOutcome,
  type StepKey,
} from "@/lib/client/pipeline";
import { clearMyData, loadProfile, loadResume } from "@/lib/client/storage";
import type { Profile, ResumeData, StepResult, StepResults } from "@/lib/types";
import { TIER_FLAGS } from "@/lib/tiers/flags";
import type { NewCard, PostingContext } from "@/lib/tiers/types";
import ResumeTailor from "./tiers/ResumeTailor";
import SaveToTracker from "./tiers/SaveToTracker";
import Tracker from "./tiers/Tracker";
import CodingRound from "./tiers/interview/CodingRound";
import DesignRound from "./tiers/interview/DesignRound";
import Interview from "./tiers/interview/Interview";
import CheckForm, { type CheckSubmit } from "./CheckForm";
import Checklist, { initialLines, type LineInfo } from "./Checklist";
import Intro from "./Intro";
import Logo from "./Logo";
import ProfileChip from "./ProfileChip";
import ProfileSteps from "./ProfileSteps";
import ThemeToggle from "./ThemeToggle";
import Report from "./report/Report";
import { btnPrimary, btnSecondary, subhead } from "./ui";

type Screen = "loading" | "intro" | "profile" | "check" | "checking" | "report" | "notjob" | "resume" | "tracker" | "interview";

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
        void import("@/fixtures/outcome").then(({ fixtureOutcome }) => fixtureOutcome(fx)).then((r) => {
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

  const [tailorTarget, setTailorTarget] = useState<PostingContext | null>(null);
  const openTailor = (t: PostingContext | null) => {
    setTailorTarget(t);
    setScreen("resume");
  };
  const back = () => setScreen(outcome?.report ? "report" : "check");

  const [practiceTarget, setPracticeTarget] = useState<PostingContext | null>(null);
  const [practiceFromTracker, setPracticeFromTracker] = useState(false);
  const [practiceKey, setPracticeKey] = useState(0);
  const openPractice = (t: PostingContext | null, fromTracker = false) => {
    setPracticeKey((k) => k + 1); // fresh setup even when reopened from the chip on the interview screen
    setPracticeTarget(t);
    setPracticeFromTracker(fromTracker);
    setScreen("interview");
  };

  const target = outcome?.report && runInput ? reportTarget(outcome, runInput) : null;
  const lastTarget = target && target.risk !== "high" ? { company: target.company, role: target.role, description: null } : null;
  const chipItems = [
    ...(TIER_FLAGS.resume ? [{ label: "Tailor my resume", onClick: () => openTailor(lastTarget) }] : []),
    ...(TIER_FLAGS.tracker ? [{ label: "My applications", onClick: () => setScreen("tracker") }] : []),
    ...(TIER_FLAGS.interview ? [{ label: "Practice an interview", onClick: () => openPractice(lastTarget) }] : []),
  ];
  const reportExtras =
    target && (TIER_FLAGS.tracker || TIER_FLAGS.resume || TIER_FLAGS.interview) ? (
      <div className="flex flex-wrap items-center justify-center gap-3">
        {TIER_FLAGS.tracker && <SaveToTracker key={reportKey} card={target} onOpen={() => setScreen("tracker")} />}
        {TIER_FLAGS.resume && target.risk !== "high" && (
          <button
            type="button"
            className={btnSecondary}
            onClick={() => openTailor(lastTarget)}
          >
            Tailor my resume for this
          </button>
        )}
        {/* No interview coaching on high-risk reports: we don't prep people for a likely scam. */}
        {TIER_FLAGS.interview && target.risk !== "high" && (
          <button type="button" className={btnSecondary} onClick={() => openPractice(lastTarget)}>
            Practice an interview for this
          </button>
        )}
      </div>
    ) : null;

  const showChip =
    profile && (screen === "check" || screen === "report" || screen === "notjob" || screen === "resume" || screen === "tracker" || screen === "interview");

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[960px] items-center justify-between gap-3 px-6 pt-6">
        <Logo />
        <div className="flex items-center gap-2">
          {showChip && <ProfileChip profile={profile} items={chipItems} onEdit={() => setScreen("profile")} onClear={onClear} />}
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
          <Report outcome={outcome} input={runInput} onRetry={onRetry} onAgain={() => { setLast(null); setScreen("check"); }} extras={reportExtras} />
        )}
        {screen === "resume" && TIER_FLAGS.resume && (
          <ResumeTailor resume={resume} target={tailorTarget} onOpenProfile={() => setScreen("profile")} onBack={back} />
        )}
        {screen === "tracker" && TIER_FLAGS.tracker && (
          <Tracker
            onBack={back}
            onPractice={TIER_FLAGS.interview ? (c) => openPractice({ company: c.company, role: c.role, description: null }, true) : undefined}
          />
        )}
        {screen === "interview" && TIER_FLAGS.interview && (
          <Interview
            key={practiceKey}
            profile={profile}
            resume={resume}
            target={practiceTarget}
            onBack={practiceFromTracker ? () => setScreen("tracker") : back}
            roundsEnabled={{
              coding: TIER_FLAGS.coding,
              design: TIER_FLAGS.design,
              case: TIER_FLAGS.case,
              finance: TIER_FLAGS.finance,
              portfolio: TIER_FLAGS.portfolio,
              challenge: TIER_FLAGS.challenge,
            }}
            renderRound={(round, panel) =>
              round === "coding" && TIER_FLAGS.coding ? (
                <CodingRound {...panel} />
              ) : (round === "design" && TIER_FLAGS.design) || (round === "challenge" && TIER_FLAGS.challenge) ? (
                <DesignRound {...panel} />
              ) : null
            }
          />
        )}
      </main>
    </div>
  );
}
