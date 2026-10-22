"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  answerPending,
  applyReply,
  buildRequest,
  canCall,
  cleanLinks,
  loadSessions,
  newSession,
  nextStep,
  removeSession,
  saveSession,
} from "@/lib/tiers/interview";
import { askInterview } from "@/lib/tiers/client";
import {
  BOARD_ROUNDS,
  CHALLENGE_MINUTES,
  CODE_ROUNDS,
  INTERVIEW_ROUNDS,
  MAX_ANSWER_CHARS,
  MAX_CONTEXT_FIELD,
  MAX_JOB_CHARS,
  MAX_RESUME_CONTEXT_CHARS,
  QUESTIONS_PER_ROUND,
  type InterviewAsk,
  type InterviewContext,
  type InterviewRound,
  type InterviewSession,
  type PostingContext,
  type RoundPanelProps,
} from "@/lib/tiers/types";
import type { Profile, ResumeData } from "@/lib/types";
import { ArrowLeftIcon } from "../../icons";
import { btnPrimary, btnSecondary, card as cardCls, linkClass, pillOff, pillOn } from "../../ui";
import Feedback from "./Feedback";
import SqlRound from "./SqlRound";
import CodingRound from "./CodingRound";
import { TIER_FLAGS, v2RoundOn } from "@/lib/tiers/flags";
import { PRESETS, type PresetId } from "@/lib/tiers/presets";

const BUSY_MSG = "The interviewer is busy right now. Your answers are saved; try again in a minute.";
const CAP_MSG = "This practice session reached its limit. Get your feedback or start a new one.";

const small =
  "inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 text-[14px] font-medium transition-colors duration-200 hover:bg-bg-soft disabled:opacity-40";
const fieldCls = "mt-1.5 min-h-12 w-full rounded-[14px] border border-border bg-card px-4 text-[17px] placeholder:text-muted";
const areaCls = "mt-1.5 w-full rounded-[14px] border border-border bg-card p-4 text-[17px] placeholder:text-muted";

// ponytail: module helper so the React compiler's purity rule doesn't flag clock reads in event handlers.
const now = () => Date.now();
const randomSeed = () => Math.floor(Math.random() * 1_000_000_000);

/** Renders a coding/design panel as a component, so the shell's callbacks aren't invoked during its own render. */
function RoundSlot({ render, round, panel }: { render?: Props["renderRound"]; round: InterviewRound; panel: RoundPanelProps }) {
  return render?.(round, panel) ?? <p className={`${cardCls} mt-6 p-5 text-[17px] text-muted`}>This round isn&apos;t available right now.</p>;
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${linkClass} inline-flex min-h-10 items-center gap-1.5 text-[15px]`}>
      <ArrowLeftIcon size={16} /> {label}
    </button>
  );
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const ROUND_BLURB: Record<InterviewRound, string> = {
  screen: "A short first call: why you, why this role.",
  behavioral: "Stories from your past, in STAR form.",
  coding: "One coding problem. Tests run on your device.",
  design: "Sketch a system and explain your choices.",
  case: "A made-up business case with one calculation.",
  finance: "Four made-up accounting and valuation questions.",
  portfolio: "Walk through your work and what you learned.",
  challenge: `A ${CHALLENGE_MINUTES}-minute design challenge.`,
  debugging: "Find and fix the bug. Tests run on your device.",
  sql: "One SQL question on made-up data. Runs on your device.",
};
// Round cards (findings 06 section 13): rough length and what the feedback checks.
const ROUND_CARD: Record<InterviewRound, { minutes: number; feedback: string }> = {
  screen: { minutes: 10, feedback: "Clarity and fit, with quotes" },
  behavioral: { minutes: 15, feedback: "STAR, “I” vs “we”, numbers" },
  coding: { minutes: 30, feedback: "Hidden tests, approach, testing" },
  design: { minutes: 25, feedback: "Parts and links on your board" },
  case: { minutes: 20, feedback: "Math checked by code, structure" },
  finance: { minutes: 15, feedback: "Answers checked by code" },
  portfolio: { minutes: 15, feedback: "Process and outcome, with quotes" },
  challenge: { minutes: CHALLENGE_MINUTES, feedback: "Your flow on the board" },
  debugging: { minutes: 20, feedback: "Hidden tests, what the bug was" },
  sql: { minutes: 20, feedback: "Result rows checked by code" },
};
// v2 rounds App.tsx (frozen) doesn't know: enabled by their own flags, rendered here.
const V2_ROUNDS: InterviewRound[] = ["sql", "debugging"];

const LINK_CLS = `${linkClass} break-all`;

function roundLabel(r: InterviewRound): string {
  return INTERVIEW_ROUNDS.find((x) => x.id === r)?.label ?? r;
}

interface Props {
  profile: Profile | null;
  resume: ResumeData | null;
  target: PostingContext | null;
  onBack: () => void;
  renderRound?: (round: InterviewRound, panel: RoundPanelProps) => ReactNode | null;
  roundsEnabled?: Partial<Record<InterviewRound, boolean>>;
}

export default function Interview({ profile, resume, target, onBack, renderRound, roundsEnabled }: Props) {
  const [company, setCompany] = useState(target?.company ?? "");
  const [role, setRole] = useState(target?.role ?? "");
  const [description, setDescription] = useState(target?.description ?? "");
  const [useResume, setUseResume] = useState(true);
  const [round, setRound] = useState<InterviewRound>("screen");
  const [preset, setPreset] = useState<PresetId | null>(null);
  const [past, setPast] = useState<InterviewSession[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [waitingFor, setWaitingFor] = useState<InterviewAsk>("question");
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [linksText, setLinksText] = useState("");
  const keptLinks = cleanLinks(linksText).length;

  const questionRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const hadContext = Boolean(target?.company || target?.role);

  const rounds = INTERVIEW_ROUNDS.filter((r) => r.field === null || (profile?.field === r.field && (V2_ROUNDS.includes(r.id) ? v2RoundOn(r.id) : roundsEnabled?.[r.id] === true)));
  const presets = TIER_FLAGS.presets ? PRESETS.filter((p) => p.rounds.some((id) => rounds.some((r) => r.id === id))) : [];
  const activePreset = presets.find((p) => p.id === preset) ?? null;
  const shownRounds = activePreset ? rounds.filter((r) => activePreset.rounds.includes(r.id)) : rounds;
  const activeRound = shownRounds.some((r) => r.id === round) ? round : (shownRounds[0]?.id ?? "screen");

  useEffect(() => {
    // Sessions live in browser storage, so read them after mount.
    /* eslint-disable react-hooks/set-state-in-effect -- read browser storage once after mount */
    setPast(loadSessions());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const pending = session?.pending ?? null;
  const done = session?.status === "done";
  useEffect(() => {
    if (pending) questionRef.current?.focus();
  }, [pending]);
  useEffect(() => {
    if (done) feedbackRef.current?.focus();
  }, [done]);

  function refreshPast() {
    setPast(loadSessions());
  }

  function leaveSession() {
    setBusy(false);
    setSession(null);
    setError(null);
    setAnswer("");
    refreshPast();
  }

  function start() {
    const ctx: InterviewContext = {
      company: company.trim() || null,
      role: role.trim() || null,
      description: description.trim() ? description.trim().slice(0, MAX_JOB_CHARS) : null,
      resume: resume && useResume ? resume.text.slice(0, MAX_RESUME_CONTEXT_CHARS) : null,
      field: profile?.field ?? null,
      ...(activePreset ? { preset: activePreset.id } : {}),
    };
    if (activeRound === "portfolio") {
      const links = cleanLinks(linksText);
      if (links.length > 0) ctx.links = links;
    }
    const s = newSession(activeRound, ctx, { id: newId(), now: now(), seed: randomSeed() });
    saveSession(s);
    setError(null);
    setAnswer("");
    setSession(s);
  }

  function openSession(s: InterviewSession) {
    setError(null);
    setAnswer("");
    setSession(s);
  }

  function update(s: InterviewSession) {
    saveSession(s);
    // A reply that lands after Leave/another session is saved but never pulls the old session back on screen.
    setSession((cur) => (cur && cur.id === s.id ? s : cur));
  }

  async function ask(s: InterviewSession, kind: InterviewAsk): Promise<InterviewSession | null> {
    if (!canCall(s, kind)) {
      setError(CAP_MSG);
      return null;
    }
    setBusy(true);
    setWaitingFor(kind);
    setError(null);
    const res = await askInterview(buildRequest(s, kind));
    setBusy(false);
    if (res.status !== "done") {
      setError(res.message ?? BUSY_MSG);
      return null;
    }
    const next = applyReply(s, kind, res.data, now());
    update(next);
    return next;
  }

  async function step(s: InterviewSession) {
    const n = nextStep(s);
    if (n === "ask") await ask(s, "question");
    else if (n === "feedback") await ask(s, "feedback");
  }

  async function send() {
    if (!session || busy || !session.pending) return;
    const text = answer.trim();
    if (!text) return;
    const next = answerPending(session, text.slice(0, MAX_ANSWER_CHARS), now());
    setAnswer("");
    update(next);
    await step(next);
  }

  const panel: RoundPanelProps | null = session ? { session, onUpdate: update, ask, busy } : null;


  // ---------- Feedback ----------
  if (session && session.status === "done") {
    return (
      <section className="mx-auto max-w-[720px] px-6 py-10 sm:py-16">
        <BackLink label="Past practice" onClick={leaveSession} />
        <div ref={feedbackRef} tabIndex={-1} className="mt-4 outline-none">
          <Feedback session={session} onAgain={leaveSession} onBack={onBack} />
        </div>
      </section>
    );
  }

  // ---------- Session ----------
  if (session && panel) {
    const total = QUESTIONS_PER_ROUND[session.round];
    const isPanelRound = CODE_ROUNDS.includes(session.round) || BOARD_ROUNDS.includes(session.round);
    const answered = session.turns.length;
    const needsRetry = !session.pending && !busy && !isPanelRound && nextStep(session) !== "done" && nextStep(session) !== "answer";
    // Coding/design panels have their own Finish (it saves the code/board first).
    const canFinish = answered >= 1 && !busy && !isPanelRound;
    const wide = CODE_ROUNDS.includes(session.round); // split pane at >= 1024 px
    return (
      <section className={`mx-auto px-6 py-10 sm:py-16 ${wide ? "max-w-[720px] lg:max-w-[1200px]" : "max-w-[720px]"}`}>
        <BackLink label="Leave practice" onClick={leaveSession} />
        <h1 className="mt-4 text-[clamp(26px,4.5vw,40px)] font-bold leading-[1.1] tracking-[-0.025em]">{roundLabel(session.round)}</h1>
        {session.context.company || session.context.role ? (
          <p className="mt-1 break-words text-[17px] text-muted">{[session.context.role, session.context.company].filter(Boolean).join(" at ")}</p>
        ) : null}
        {session.round === "portfolio" && session.context.links && session.context.links.length > 0 && (
          <div className="mt-4">
            <h2 className="text-[15px] font-semibold">Portfolio links</h2>
            <ul className="mt-1 space-y-1 text-[15px]">
              {session.context.links.map((l) => (
                <li key={l}>
                  <a href={l} target="_blank" rel="noopener noreferrer nofollow" className={LINK_CLS}>
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isPanelRound ? (
          <div className="mt-6">
            {session.round === "sql" && v2RoundOn("sql") ? (
              <SqlRound {...panel} />
            ) : session.round === "debugging" && v2RoundOn("debugging") ? (
              <CodingRound {...panel} />
            ) : (
              <RoundSlot render={renderRound} round={session.round} panel={panel} />
            )}
          </div>
        ) : (
          <>
            <p role="status" aria-live="polite" className="sr-only">
              {pending ? `Question ${Math.min(answered + 1, total)} of ${total}. ${pending}` : ""}
            </p>
            {pending && (
              <div key={answered} ref={questionRef} tabIndex={-1} className={`${cardCls} animate-enter mt-6 p-5 outline-offset-2 sm:p-6`}>
                <p className="text-[14px] font-medium text-muted">
                  Question {Math.min(answered + 1, total)} of {total}
                </p>
                <p className="mt-2 break-words text-[20px] font-semibold leading-snug">{pending}</p>
              </div>
            )}
            {pending && (
              <form
                className="mt-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <label htmlFor="iv-answer" className="text-[15px] font-medium">
                  Your answer
                </label>
                <textarea
                  id="iv-answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  maxLength={MAX_ANSWER_CHARS}
                  rows={6}
                  disabled={busy}
                  className={areaCls}
                  aria-describedby="iv-count"
                />
                <p id="iv-count" className="mt-1 text-right text-[13px] text-muted">
                  {answer.length} / {MAX_ANSWER_CHARS}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="submit" disabled={busy || !answer.trim()} className={btnPrimary}>
                    Send answer
                  </button>
                </div>
              </form>
            )}
            {needsRetry && (
              <div className="mt-6">
                <button type="button" onClick={() => void step(session)} className={btnPrimary}>
                  {nextStep(session) === "feedback" ? "Get my feedback" : "Try again"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Always rendered so screen readers hear the text change. */}
        <p role="status" className={busy ? "mt-5 text-[16px] text-muted motion-safe:animate-pulse" : "sr-only"}>
          {!busy
            ? ""
            : waitingFor === "feedback"
              ? "Putting your feedback together…"
              : waitingFor === "hint"
                ? "Thinking of a hint…"
                : "Thinking of the next question…"}
        </p>
        {error && (
          <p role="alert" className="mt-5 text-[16px] font-medium">
            {error}
          </p>
        )}
        {canFinish && (
          <div className="mt-8">
            <button type="button" onClick={() => void ask(session, "feedback")} className={btnSecondary}>
              End and get feedback
            </button>
          </div>
        )}
      </section>
    );
  }

  // ---------- Setup ----------
  const jd = (
    <div className="mt-6">
      <label htmlFor="iv-desc" className="text-[15px] font-medium">
        Job description <span className="font-normal text-muted">(optional)</span>
      </label>
      {!hadContext && <p className="mt-1 text-[15px] text-muted">Helps fit the questions.</p>}
      <textarea
        id="iv-desc"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={MAX_JOB_CHARS}
        rows={5}
        className={areaCls}
      />
    </div>
  );
  const names = (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="iv-company" className="text-[15px] font-medium">
          Company
        </label>
        <input id="iv-company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={MAX_CONTEXT_FIELD} className={fieldCls} />
      </div>
      <div>
        <label htmlFor="iv-role" className="text-[15px] font-medium">
          Role
        </label>
        <input id="iv-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={MAX_CONTEXT_FIELD} className={fieldCls} />
      </div>
    </div>
  );

  return (
    <section className="mx-auto max-w-[720px] px-6 py-10 sm:py-16">
      <BackLink label="Back" onClick={onBack} />
      <h1 className="mt-4 text-[clamp(30px,5vw,48px)] font-bold leading-[1.1] tracking-[-0.025em]">Practice an interview</h1>
      <p className="mt-2 max-w-[560px] text-[17px] text-muted">
        Answer a few questions, get feedback. Answers stay here; an AI sees the current practice.
      </p>

      {hadContext ? (
        <>
          {names}
          {jd}
        </>
      ) : (
        <>
          {jd}
          {names}
        </>
      )}

      {resume && (
        <div className="mt-6">
          <label className="inline-flex min-h-10 items-center gap-3 text-[16px]">
            <input type="checkbox" checked={useResume} onChange={(e) => setUseResume(e.target.checked)} className="size-5 accent-[var(--accent)]" />
            Use my resume
          </label>
          <p className="text-[14px] text-muted">Sent to the AI with your answers.</p>
        </div>
      )}

      {presets.length > 0 && (
        <fieldset className="mt-6">
          <legend className="text-[15px] font-medium">
            Company style <span className="font-normal text-muted">(optional)</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[null, ...presets].map((p) => (
              <label key={p?.id ?? "any"} className={`${(p?.id ?? null) === (activePreset?.id ?? null) ? pillOn : pillOff} cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2`}>
                <input type="radio" name="iv-preset" checked={(p?.id ?? null) === (activePreset?.id ?? null)} onChange={() => setPreset(p?.id ?? null)} className="sr-only" />
                {p?.label ?? "Any"}
              </label>
            ))}
          </div>
          {activePreset && (
            <p className="mt-2 text-[14px] text-muted">
              Based on{" "}
              <a href={activePreset.source.url} target="_blank" rel="noopener noreferrer" className={LINK_CLS}>
                {activePreset.source.label}
              </a>
              . Practice only; not affiliated.
            </p>
          )}
        </fieldset>
      )}

      <fieldset className="mt-6">
        <legend className="text-[15px] font-medium">Round</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {shownRounds.map((r) => {
            const on = activeRound === r.id;
            return (
              <label
                key={r.id}
                className={`${cardCls} cursor-pointer p-4 transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${on ? "border-accent bg-accent/10" : "hover:bg-bg-soft"}`}
              >
                <input type="radio" name="iv-round" value={r.id} checked={on} onChange={() => setRound(r.id)} className="sr-only" />
                <span className="flex items-baseline justify-between gap-3">
                  <span className={`text-[17px] font-semibold ${on ? "text-accent" : ""}`}>
                    {on && <span aria-hidden="true">✓ </span>}
                    {r.label}
                  </span>
                  <span className="shrink-0 text-[14px] text-muted">~{ROUND_CARD[r.id].minutes} min</span>
                </span>
                <span className="mt-1 block text-[15px]">{ROUND_BLURB[r.id]}</span>
                <span className="mt-1 block text-[14px] text-muted">Feedback: {ROUND_CARD[r.id].feedback}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {activeRound === "portfolio" && (
        <div className="mt-6">
          <label htmlFor="iv-links" className="text-[15px] font-medium">
            Portfolio links <span className="font-normal text-muted">(optional)</span>
          </label>
          <p id="iv-links-help" className="mt-1 text-[15px] text-muted">
            Start each with https:// (up to 5). Never opened; only the link text is read.
          </p>
          <textarea
            id="iv-links"
            value={linksText}
            onChange={(e) => setLinksText(e.target.value)}
            rows={3}
            placeholder="One link per line"
            aria-describedby="iv-links-help iv-links-kept"
            className={areaCls}
          />
          <p id="iv-links-kept" className="mt-1 text-[15px] text-muted">
            {linksText.trim() ? `${keptLinks} ${keptLinks === 1 ? "link" : "links"} kept` : ""}
          </p>
        </div>
      )}

      <div className="mt-8">
        <button type="button" onClick={start} className={btnPrimary}>
          Start
        </button>
      </div>

      {past.length > 0 && (
        <div className="mt-12">
          <h2 className="text-[20px] font-semibold">Past practice</h2>
          <ul className="mt-3 space-y-3">
            {past.map((s) => (
              <li key={s.id} className={`${cardCls} flex flex-wrap items-center justify-between gap-3 p-4`}>
                <div className="min-w-0">
                  <p className="break-words text-[16px] font-semibold">{roundLabel(s.round)}</p>
                  <p className="break-words text-[14px] text-muted">
                    {[s.context.company, new Date(s.createdAt).toLocaleDateString()].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className={small} onClick={() => openSession(s)}>
                    Open<span className="sr-only"> {roundLabel(s.round)} practice</span>
                  </button>
                  {confirming === s.id ? (
                    <span role="group" aria-label={`Delete ${roundLabel(s.round)} practice?`} className="flex flex-wrap items-center gap-2 text-[14px]">
                      Delete this?
                      <button
                        type="button"
                        className={`${small} border-accent text-accent`}
                        onClick={() => {
                          removeSession(s.id);
                          setConfirming(null);
                          refreshPast();
                        }}
                      >
                        Delete
                      </button>
                      <button type="button" className={small} onClick={() => setConfirming(null)}>
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button type="button" className={small} onClick={() => setConfirming(s.id)}>
                      Delete<span className="sr-only"> {roundLabel(s.round)} practice</span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
