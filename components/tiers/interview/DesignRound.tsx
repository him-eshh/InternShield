"use client";
import { useEffect, useRef, useState } from "react";
import { answerPending, challengeLeft } from "@/lib/tiers/interview";
import { emptyBoard, fromJson, toJson } from "@/lib/tiers/board";
import {
  MAX_ANSWER_CHARS,
  QUESTIONS_PER_ROUND,
  type Board as BoardData,
  type InterviewSession,
  type RoundPanelProps,
} from "@/lib/tiers/types";
import { Spinner } from "../../icons";
import { btnPrimary, btnSecondary, card as cardCls } from "../../ui";
import Board from "./Board";

// Module helper so the React compiler's purity rule doesn't flag clock reads.
const now = () => Date.now();

function mmss(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** 20-minute timer for the design challenge. Informational only: nothing locks at zero. */
function ChallengeTimer({ session }: { session: InterviewSession }) {
  const [left, setLeft] = useState(() => challengeLeft(session, now()));
  const over = left <= 0;
  useEffect(() => {
    if (over) return; // stops ticking at 00:00
    const t = setInterval(() => setLeft(challengeLeft(session, now())), 1000);
    return () => clearInterval(t);
  }, [session, over]);
  const note = left <= 0 ? "Time's up. Finish when you're ready." : left <= 5 * 60_000 ? "Under 5 minutes left" : "";
  return (
    <div>
      <p role="timer" className="text-[15px] font-medium tabular-nums">
        {mmss(left)} left
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {note}
      </p>
      {note && (
        <p aria-hidden="true" className="text-[15px] text-muted">
          {note}
        </p>
      )}
    </div>
  );
}

export default function DesignRound({ session, onUpdate, ask, busy }: RoundPanelProps) {
  const [board, setBoard] = useState<BoardData>(() => fromJson(session.board) ?? emptyBoard());
  const [answer, setAnswer] = useState("");
  const latest = useRef(session);
  const boardRef = useRef(board);
  const dirty = useRef(false);
  useEffect(() => {
    latest.current = session;
    boardRef.current = board;
  }, [session, board]);

  // Save the board shortly after edits so a reload keeps it.
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => {
      dirty.current = false;
      onUpdate({ ...latest.current, board: toJson(boardRef.current), updatedAt: Date.now() });
    }, 500);
    return () => clearTimeout(t);
  }, [board, onUpdate]);

  const total = QUESTIONS_PER_ROUND[session.round];
  const prompt = session.pending ?? session.turns[0]?.question ?? "";
  const text = answer.trim().slice(0, MAX_ANSWER_CHARS);
  const answeredAfter = session.turns.length + (session.pending && text ? 1 : 0);
  // Questions asked so far, including the one waiting; a follow-up is only offered while more remain.
  const asked = session.turns.length + (session.pending ? 1 : 0);
  const moreToAsk = asked < total;
  const canFollowUp = moreToAsk && (session.pending ? text.length > 0 : true);
  const canFinish = answeredAfter > 0;

  function withBoard(s: InterviewSession): InterviewSession {
    return { ...s, board: toJson(boardRef.current), updatedAt: Date.now() };
  }

  /** Records the typed answer (if a question is waiting) and the board. */
  function record(): InterviewSession {
    let s = withBoard(latest.current);
    if (s.pending && text) {
      s = answerPending(s, text, Date.now());
      setAnswer(""); // only clear what was actually saved
    }
    onUpdate(s);
    return s;
  }

  async function followUp() {
    if (busy || !canFollowUp) return;
    dirty.current = false;
    await ask(record(), "question");
  }

  async function finish() {
    if (busy || !canFinish) return;
    dirty.current = false;
    await ask(record(), "feedback");
  }

  const questionNo = Math.min(session.turns.length + 1, total);

  return (
    <div className="space-y-5">
      {session.round === "challenge" && <ChallengeTimer session={session} />}
      <section className={`${cardCls} p-5 sm:p-6`}>
        <p className="text-[15px] text-muted">
          Question {questionNo} of {total}
        </p>
        <h2 className="mt-1 whitespace-pre-line break-words text-[19px] font-semibold leading-snug tracking-[-0.01em]">
          {prompt || "Sketch your design below, then describe it."}
        </h2>
      </section>

      <Board
        board={board}
        defaultKind={session.round === "challenge" ? "screen" : "server"}
        onChange={(b) => {
          dirty.current = true;
          setBoard(b);
        }}
      />

      <section>
        <label htmlFor="design-answer" className="text-[17px] font-semibold">
          Explain your design
        </label>
        <textarea
          id="design-answer"
          value={answer}
          maxLength={MAX_ANSWER_CHARS}
          onChange={(e) => setAnswer(e.target.value)}
          rows={5}
          disabled={busy || !session.pending}
          className="mt-1.5 w-full rounded-[14px] border border-border bg-card p-4 text-[17px]"
        />
        <p className="mt-1 text-[13px] text-muted">
          {answer.length} / {MAX_ANSWER_CHARS}
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        {moreToAsk && (
          <button type="button" className={btnSecondary} disabled={busy || !canFollowUp} onClick={followUp}>
            {busy && <Spinner size={16} />} Ask me a follow-up
          </button>
        )}
        <button type="button" className={btnPrimary} disabled={busy || !canFinish} onClick={finish}>
          {busy && <Spinner size={16} />} Finish and get feedback
        </button>
      </div>
      {!canFinish && <p className="text-[15px] text-muted">Answer the question first.</p>}
      {!session.pending && !busy && moreToAsk && (
        <p className="text-[15px] text-muted">Your answer is saved. Ask me a follow-up to continue, or finish.</p>
      )}
    </div>
  );
}
