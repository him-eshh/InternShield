"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  answerPending,
  applyReply,
  buildRequest,
  canCall,
  loadSessions,
  newSession,
  nextStep,
  removeSession,
  saveSession,
} from "@/lib/tiers/interview";
import { askInterview } from "@/lib/tiers/client";
import {
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

const BUSY_MSG = "The interviewer is busy right now. Your answers are saved; try again in a minute.";
const CAP_MSG = "This practice session reached its limit. Get your feedback or start a new one.";

const small =
  "inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 text-[14px] font-medium transition-colors duration-200 hover:bg-bg-soft disabled:opacity-40";
const fieldCls = "mt-1.5 min-h-12 w-full rounded-[14px] border border-border bg-card px-4 text-[17px] placeholder:text-muted";
const areaCls = "mt-1.5 w-full rounded-[14px] border border-border bg-card p-4 text-[17px] placeholder:text-muted";

// ponytail: module helper so the React compiler's purity rule doesn't flag clock reads in event handlers.
const now = () => Date.now();

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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
  const [past, setPast] = useState<InterviewSession[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [waitingFor, setWaitingFor] = useState<InterviewAsk>("question");
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");

  const questionRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const hadContext = Boolean(target?.company || target?.role);

  const rounds = INTERVIEW_ROUNDS.filter((r) => !r.techOnly || (profile?.field === "tech" && roundsEnabled?.[r.id] === true));
  const activeRound = rounds.some((r) => r.id === round) ? round : "screen";

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
    };
    const s = newSession(activeRound, ctx, { id: newId(), now: Date.now(), seed: Math.floor(Math.random() * 1_000_000_000) });
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
    setSession(s);
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

  const back = (label: string, fn: () => void) => (
    <button type="button" onClick={fn} className={`${linkClass} inline-flex min-h-10 items-center gap-1.5 text-[15px]`}>
      <ArrowLeftIcon size={16} /> {label}
    </button>
  );

  // ---------- Feedback ----------
  if (session && session.status === "done") {
    return (
      <section className="mx-auto max-w-[720px] px-6 py-10 sm:py-16">
        {back("Back", leaveSession)}
        <div ref={feedbackRef} tabIndex={-1} className="mt-4 outline-none">
          <Feedback session={session} onAgain={leaveSession} onBack={onBack} />
        </div>
      </section>
    );
  }

  // ---------- Session ----------
  if (session && panel) {
    const total = QUESTIONS_PER_ROUND[session.round];
    const isPanelRound = session.round === "coding" || session.round === "design";
    const custom = isPanelRound ? renderRound?.(session.round, panel) ?? null : null;
    const answered = session.turns.length;
    const needsRetry = !session.pending && !busy && !isPanelRound && nextStep(session) !== "done" && nextStep(session) !== "answer";
    // Coding/design panels have their own Finish (it saves the code/board first).
    const canFinish = answered >= 1 && !busy && !isPanelRound;
    return (
      <section className="mx-auto max-w-[720px] px-6 py-10 sm:py-16">
        {back("Leave practice", leaveSession)}
        <h1 className="mt-4 text-[clamp(26px,4.5vw,40px)] font-bold leading-[1.1] tracking-[-0.025em]">{roundLabel(session.round)}</h1>
        {session.context.company || session.context.role ? (
          <p className="mt-1 break-words text-[17px] text-muted">{[session.context.role, session.context.company].filter(Boolean).join(" at ")}</p>
        ) : null}

        {isPanelRound ? (
          custom ?? <p className={`${cardCls} mt-6 p-5 text-[17px] text-muted`}>This round isn&apos;t available right now.</p>
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
        Paste the job description <span className="font-normal text-muted">(optional)</span>
      </label>
      {!hadContext && <p className="mt-1 text-[15px] text-muted">Paste the job description so the questions fit the role.</p>}
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
      {back("Back", onBack)}
      <h1 className="mt-4 text-[clamp(30px,5vw,48px)] font-bold leading-[1.1] tracking-[-0.025em]">Practice an interview</h1>
      <p className="mt-2 max-w-[560px] text-[17px] text-muted">
        Answer a few questions and get feedback on what worked. Your answers stay in this browser; only the text of the current practice is sent to write the questions and feedback.
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
        </div>
      )}

      <fieldset className="mt-6">
        <legend className="text-[15px] font-medium">Round</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {rounds.map((r) => (
            <label key={r.id} className={`${activeRound === r.id ? pillOn : pillOff} cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2`}>
              <input type="radio" name="iv-round" value={r.id} checked={activeRound === r.id} onChange={() => setRound(r.id)} className="sr-only" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>

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
