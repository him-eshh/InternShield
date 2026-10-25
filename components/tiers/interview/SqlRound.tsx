"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { MAX_ANSWER_CHARS, MAX_CODE_CHARS, type CodeStats, type RoundPanelProps } from "@/lib/tiers/types";
import { compareResults, getSqlProblem, sampleTables, showCell, SQL_SCHEMA, SQL_STARTER, type ResultSet, type SqlGrade } from "@/lib/tiers/sql";
import { runSql, stopRunners } from "@/lib/tiers/runner";
import { card as cardCls } from "../../ui";
import { ActionBar, FinishStep, HintList, StatusLine } from "./RoundActions";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => <div className="min-h-[240px] rounded-[14px] border border-border bg-card" aria-hidden="true" />,
});

const NO_STATS: CodeStats = { runsBeforeSubmit: 0, submits: 0, firstSubmitAt: null };
const PREVIEW_ROWS = 8;
const SAMPLE_ROWS = 4;
const TABLES = sampleTables();
// ponytail: module helper so the React compiler's purity rule doesn't flag clock reads in handlers.
const clock = () => Date.now();

export default function SqlRound({ session, onUpdate, ask, busy, onSkip }: RoundPanelProps) {
  const problem = getSqlProblem(session.problemId);
  const [code, setCode] = useState(session.editorDraft?.code ?? (session.code?.language === "sql" ? session.code.code : SQL_STARTER));
  const [approach, setApproach] = useState(session.editorDraft?.approach ?? "");
  const [running, setRunning] = useState<"run" | "submit" | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ got: ResultSet; want: ResultSet; grade: SqlGrade } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const latest = useRef(session);
  function persistDraft(text: string, plan: string) {
    const next = { ...latest.current, editorDraft: { language: "sql" as const, code: text.slice(0, MAX_CODE_CHARS), approach: plan.slice(0, MAX_ANSWER_CHARS) } };
    latest.current = next;
    onUpdate(next);
  }
  useEffect(() => {
    latest.current = session;
  }, [session]);

  if (!problem) {
    return (
      <div className={`${cardCls} p-6`}>
        <p className="text-[17px]">We couldn&apos;t find this SQL problem. Start a new practice round.</p>
      </div>
    );
  }

  const submitted = session.code && session.code.problemId === problem.id ? session.code : null;
  const disabled = running !== null || busy;

  async function run(kind: "run" | "submit") {
    if (!problem) return;
    setRunning(kind);
    setRunError(null);
    setResult(null);
    setStatus(kind === "run" ? "Running your query." : "Checking your query.");
    const res = await runSql(SQL_SCHEMA, problem.reference, code, { onLoading: setLoading });
    setRunning(null);
    if (!res.ok && res.message === "Stopped.") return;
    if (!res.ok) {
      setRunError(res.message);
      setStatus(""); // the error card below is the announcement
      return;
    }
    const grade = compareResults(res.want, res.got, problem.ordered);
    setResult({ got: res.got, want: res.want, grade });
    const st = latest.current.stats ?? NO_STATS;
    if (kind === "run") {
      setStatus(grade.message);
      if (!st.submits) onUpdate({ ...latest.current, stats: { ...st, runsBeforeSubmit: st.runsBeforeSubmit + 1 }, updatedAt: clock() });
      return;
    }
    setStatus("");
    const now = clock();
    onUpdate({
      ...latest.current,
      code: {
        problemId: problem.id,
        language: "sql",
        code: code.slice(0, MAX_CODE_CHARS),
        passed: grade.ok ? 1 : 0,
        total: 1,
        detail: { message: grade.message, ...(grade.diffs.length ? { diffs: grade.diffs.slice(0, 3) } : {}) },
      },
      stats: { ...st, submits: st.submits + 1, firstSubmitAt: st.firstSubmitAt ?? now },
      updatedAt: now,
    });
  }

  function stop() {
    stopRunners();
    setLoading(false);
    setStatus("Stopped.");
  }

  async function hint() {
    const prev = latest.current.code ?? null;
    const next = await ask(
      { ...latest.current, code: { problemId: problem!.id, language: "sql", code: code.slice(0, MAX_CODE_CHARS), passed: submitted?.passed ?? 0, total: 1 } },
      "hint",
    );
    if (!next) return;
    onUpdate({ ...next, code: prev });
    setStatus("A new hint is below.");
  }

  async function finish() {
    if (!problem || !submitted) return;
    const updated = {
      ...latest.current,
      turns: [{ question: problem.prompt, answer: `${approach.trim().slice(0, MAX_ANSWER_CHARS)}\n\nQuery:\n${submitted.code}` }],
      pending: null,
      updatedAt: clock(),
    };
    onUpdate(updated);
    await ask(updated, "feedback");
  }

  const hints = session.hints ?? [];
  const matched = submitted ? submitted.passed === submitted.total : false;
  const showResult = !loading && !status && !!submitted;
  const statusText = loading ? "Loading SQL… (first time takes a few seconds)" : status || (submitted ? (matched ? "Result matches the expected rows" : "Result doesn't match the expected rows") : "");

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <div className="space-y-4">
        <section className={`${cardCls} p-5 sm:p-6`}>
          <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-pretty!">{problem.title}</h2>
          <p className="mt-2 break-words text-[17px] leading-relaxed">{problem.prompt}</p>
          <p className="mt-2 text-[15px] text-muted">
            Return columns: <code className="font-mono">{problem.columns.join(", ")}</code>
            {problem.ordered ? " · order counts" : ""}
          </p>
        </section>

        <section aria-label="Tables" className="space-y-3">
          <h3 className="text-[15px] font-semibold">Tables (SQLite), first {SAMPLE_ROWS} rows</h3>
          {TABLES.map((t) => (
            <div key={t.name} className="max-w-full overflow-x-auto rounded-[14px] border border-border bg-card">
              <table className="w-full border-collapse text-left font-mono text-[13px]">
                <caption className="border-b border-border bg-bg-soft px-3 py-1.5 text-left font-semibold">
                  {t.name} <span className="font-normal text-muted">({t.rows.length} rows)</span>
                </caption>
                <thead>
                  <tr>
                    {t.columns.map((c) => (
                      <th key={c} scope="col" className="px-3 py-1.5 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.slice(0, SAMPLE_ROWS).map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {r.map((v, j) => (
                        <td key={j} className="px-3 py-1">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <p className="text-[13px] text-muted">A grade of NULL means the course is still in progress.</p>
        </section>

        <section>
          <label htmlFor="sql-approach" className="text-[17px] font-semibold">
            Explain your approach
          </label>
          <textarea
            id="sql-approach"
            value={approach}
            maxLength={MAX_ANSWER_CHARS}
            onChange={(e) => { setApproach(e.target.value); persistDraft(code, e.target.value); }}
            rows={4}
            placeholder="Which tables you join, how NULLs are handled, and why."
            className="mt-1.5 w-full rounded-[14px] border border-border bg-card p-4 text-[17px]"
          />
          <p className="mt-1 text-[13px] text-muted">
            {approach.length} / {MAX_ANSWER_CHARS}
          </p>
        </section>
      </div>

      <div className="space-y-4">
        <CodeEditor value={code} language="sql" onChange={(text) => { setCode(text); persistDraft(text, approach); }} label={`${problem.title} query editor, SQL`} />

        <ActionBar runKey="run" runLabel="Run query" running={running} disabled={disabled} busy={busy} passed={matched} onRun={() => run("run")} onSubmit={() => run("submit")} onStop={stop} onHint={hint} onSkip={onSkip} />

        <StatusLine text={statusText} result={showResult} ok={matched} />

        {runError && (
          <p role="alert" className="rounded-[14px] border border-border bg-bg-soft p-4 text-[15px] text-bad">
            <strong>Could not run.</strong> {runError}
          </p>
        )}

        {result && result.grade.diffs.length > 0 && (
          <ul className={`${cardCls} space-y-1 p-4 font-mono text-[14px]`} aria-label="Differences">
            {result.grade.diffs.map((d, i) => (
              <li key={i} className="break-all">
                {d}
              </li>
            ))}
          </ul>
        )}

        {result && (
          <div className="grid gap-3 xl:grid-cols-2">
            <ResultTable title="Your result" set={result.got} />
            <ResultTable title="Expected result" set={result.want} />
          </div>
        )}

        <HintList hints={hints} />

        <FinishStep submitted={!!submitted} passed={matched} what="query" disabled={disabled} busy={busy} onFinish={finish} />
      </div>
    </div>
  );
}

function ResultTable({ title, set }: { title: string; set: ResultSet }) {
  if (!set.columns.length) return null;
  return (
    <div className="max-w-full overflow-x-auto rounded-[14px] border border-border bg-card">
      <table className="w-full border-collapse text-left font-mono text-[14px]">
        <caption className="border-b border-border bg-bg-soft px-3 py-1.5 text-left font-sans text-[14px] font-semibold">
          {title} <span className="font-normal text-muted">({set.rows.length} {set.rows.length === 1 ? "row" : "rows"})</span>
        </caption>
        <thead>
          <tr>
            {set.columns.map((c, i) => (
              <th key={i} scope="col" className="px-3 py-2 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {set.rows.slice(0, PREVIEW_ROWS).map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((v, j) => (
                <td key={j} className="px-3 py-1.5">
                  {showCell(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {set.rows.length > PREVIEW_ROWS && <p className="border-t border-border px-3 py-2 text-[13px] text-muted">{PREVIEW_ROWS} of {set.rows.length} rows shown</p>}
    </div>
  );
}
