"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  MAX_ANSWER_CHARS,
  MAX_CODE_CHARS,
  type CaseOutput,
  type CodeLanguage,
  type CodeStats,
  type RoundPanelProps,
} from "@/lib/tiers/types";
import { getProblem, gradeOutputs } from "@/lib/tiers/problems";
import { preloadPython, runCode, stopRunners } from "@/lib/tiers/runner";
import { card as cardCls, pillOff, pillOn } from "../../ui";
import { ActionBar, FinishStep, HintList, StatusLine } from "./RoundActions";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => <div className="min-h-[240px] rounded-[14px] border border-border bg-card" aria-hidden="true" />,
});

const LANGS: { id: CodeLanguage; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
];
const langLabel = (l: CodeLanguage) => LANGS.find((x) => x.id === l)?.label ?? l;

interface ExampleRow {
  input: string;
  expected: string;
  got: string;
  pass: boolean;
}

const show = (v: unknown) => {
  try {
    return JSON.stringify(v) ?? "undefined";
  } catch {
    return String(v);
  }
};
const NO_STATS: CodeStats = { runsBeforeSubmit: 0, submits: 0, firstSubmitAt: null };
const showOut = (o: CaseOutput) => (o.ok ? show(o.value) : `Error: ${o.error}`);

export default function CodingRound({ session, onUpdate, ask, busy, initialLanguage, runnableLanguages, onSkip }: RoundPanelProps) {
  const problem = getProblem(session.problemId ?? "");
  const debug = session.round === "debugging";
  const [language, setLanguage] = useState<CodeLanguage>(session.editorDraft?.language ?? session.code?.language ?? initialLanguage ?? "python");
  const [codes, setCodes] = useState<Partial<Record<CodeLanguage, string>>>(() =>
    session.editorDraft ? { [session.editorDraft.language]: session.editorDraft.code } : session.code ? { [session.code.language]: session.code.code } : {},
  );
  const [approach, setApproach] = useState(session.editorDraft?.approach ?? "");
  const [running, setRunning] = useState<"examples" | "submit" | null>(null);
  const [loadingPy, setLoadingPy] = useState(false);
  const [rows, setRows] = useState<ExampleRow[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [logs, setLogs] = useState("");
  const [status, setStatus] = useState("");
  const latest = useRef(session);
  useEffect(() => {
    latest.current = session;
  }, [session]);
  useEffect(() => {
    if (language === "python") preloadPython();
  }, [language]);
  const [slowLoad, setSlowLoad] = useState(false);
  useEffect(() => {
    if (!loadingPy) return;
    const t = window.setTimeout(() => setSlowLoad(true), 6000);
    return () => {
      window.clearTimeout(t);
      setSlowLoad(false);
    };
  }, [loadingPy]);

  if (!problem) {
    return (
      <div className={`${cardCls} p-6`}>
        <p className="text-[17px]">We couldn&apos;t find this coding problem. Start a new practice round.</p>
      </div>
    );
  }

  // TypeScript is only transpiled (no type check), so the JS starter is valid TS.
  const code = codes[language] ?? problem.starter[language] ?? (language === "typescript" ? problem.starter.javascript : "");
  const submitted = session.code && session.code.problemId === problem.id ? session.code : null;
  const disabled = running !== null || busy;

  function setCode(v: string) {
    setCodes((c) => ({ ...c, [language]: v }));
    persistDraft(language, v, approach);
  }

  function persistDraft(lang: CodeLanguage, text: string, plan: string) {
    const next = { ...latest.current, editorDraft: { language: lang, code: text.slice(0, MAX_CODE_CHARS), approach: plan.slice(0, MAX_ANSWER_CHARS) } };
    latest.current = next;
    onUpdate(next);
  }

  async function runExamples() {
    if (!problem) return;
    setRunning("examples");
    setRunError(null);
    setRows(null);
    setLogs("");
    setStatus("Running your code on the examples.");
    const res = await runCode(language, code, problem.functionName, problem.examples.map((e) => e.args), {
      onLoading: setLoadingPy,
    });
    setRunning(null);
    if (!res.ok && res.message === "Stopped.") return; // user pressed Stop: not an error
    if (!res.ok) {
      setRunError(res.message);
      setStatus(""); // the error card below is the announcement
      return;
    }
    const graded = gradeOutputs(problem.examples, res.outputs);
    setRows(
      problem.examples.map((e, i) => ({
        input: e.args.map(show).join(", "),
        expected: show(e.expected),
        got: showOut(res.outputs[i] ?? { ok: false, error: "No result" }),
        pass: graded.results[i] === true,
      })),
    );
    setLogs(res.logs);
    setStatus(`${graded.passed} of ${graded.total} examples passed.`);
    const st = latest.current.stats ?? NO_STATS;
    if (!st.submits) onUpdate({ ...latest.current, stats: { ...st, runsBeforeSubmit: st.runsBeforeSubmit + 1 }, updatedAt: Date.now() });
  }

  async function submit() {
    if (!problem) return;
    setRunning("submit");
    setRunError(null);
    setStatus("Running the hidden tests.");
    const res = await runCode(language, code, problem.functionName, problem.tests.map((t) => t.args), {
      onLoading: setLoadingPy,
    });
    setRunning(null);
    if (!res.ok && res.message === "Stopped.") return;
    if (!res.ok) {
      setRunError(res.message);
      setStatus("");
      return;
    }
    const graded = gradeOutputs(problem.tests, res.outputs);
    setLogs("");
    // The result line below (from session.code) is the live announcement; no second copy here.
    setStatus("");
    const st = latest.current.stats ?? NO_STATS;
    const now = Date.now();
    const bad = graded.results.findIndex((r) => r !== true);
    const failed = bad >= 0 ? { input: problem.tests[bad].args.map(show).join(", "), expected: show(problem.tests[bad].expected), got: showOut(res.outputs[bad] ?? { ok: false, error: "No result" }) } : undefined;
    onUpdate({
      ...latest.current,
      code: { problemId: problem.id, language, code: code.slice(0, MAX_CODE_CHARS), passed: graded.passed, total: graded.total, ...(failed ? { detail: { failed } } : {}) },
      stats: { ...st, submits: st.submits + 1, firstSubmitAt: st.firstSubmitAt ?? now },
      updatedAt: now,
    });
  }

  function stop() {
    stopRunners();
    setLoadingPy(false);
    setStatus("Stopped.");
  }

  async function hint() {
    const s = {
      ...latest.current,
      code: latest.current.code ?? null,
    };
    // Send the latest editor code with the hint request.
    const withCode = {
      ...s,
      code: { problemId: problem!.id, language, code: code.slice(0, MAX_CODE_CHARS), passed: submitted?.passed ?? 0, total: submitted?.total ?? problem!.tests.length },
    };
    const next = await ask(withCode, "hint");
    if (!next) return;
    // The hint request carried the editor code; keep session.code as the last real Submit only.
    onUpdate({ ...next, code: s.code });
    setStatus("A new hint is below.");
  }

  async function finish() {
    if (!problem || !submitted) return;
    const answer = `${approach.trim().slice(0, MAX_ANSWER_CHARS)}\n\nCode:\n${submitted.code}`;
    const updated = {
      ...latest.current,
      turns: [{ question: problem.prompt, answer }],
      pending: null,
      updatedAt: Date.now(),
    };
    onUpdate(updated);
    await ask(updated, "feedback");
  }

  const hints = session.hints ?? [];
  const passedAll = !!submitted && submitted.passed === submitted.total;
  const showResult = !loadingPy && !status && !!submitted;
  const statusText = loadingPy
    ? slowLoad
      ? `Still loading ${langLabel(language)}… it's a one-time download of a few MB. Your code is kept.`
      : `Loading ${langLabel(language)}… (first time takes a few seconds)`
    : status || (submitted ? `${submitted.passed} of ${submitted.total} hidden tests passed` : "");

  return (
    // >= 1024 px: problem and plan left; editor, actions and results right. Stacks below.
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <div className="space-y-4">
        <section className={`${cardCls} p-5 sm:p-6`}>
          <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-pretty!">{problem.title}</h2>
          <p className="mt-2 whitespace-pre-line break-words text-[17px] leading-relaxed">{problem.prompt}</p>
          <p className="mt-2 text-[15px] text-muted">
            {debug ? "Fix" : "Write a function named"} <code className="font-mono">{problem.functionName}</code>.
          </p>
        </section>

        <section>
          <label htmlFor="coding-approach" className="text-[17px] font-semibold">
            {debug ? "What was the bug?" : "Explain your approach"}
          </label>
          <textarea
            id="coding-approach"
            value={approach}
            maxLength={MAX_ANSWER_CHARS}
            onChange={(e) => { setApproach(e.target.value); persistDraft(language, code, e.target.value); }}
            rows={5}
            placeholder="Your idea, one edge case, and the time and space complexity."
            className="mt-1.5 w-full rounded-[14px] border border-border bg-card p-4 text-[17px]"
          />
          <p className="mt-1 text-[13px] text-muted">
            {approach.length} / {MAX_ANSWER_CHARS}
          </p>
        </section>
      </div>

      <div className="space-y-4">
        <div role="group" aria-label="Language" className="flex flex-wrap items-center gap-2">
          {LANGS.filter((l) => !runnableLanguages || runnableLanguages.includes(l.id)).map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={language === l.id}
              disabled={running !== null}
              onClick={() => {
                setLanguage(l.id);
                persistDraft(l.id, codes[l.id] ?? problem.starter[l.id] ?? problem.starter.javascript ?? "", approach);
                setRows(null);
                setRunError(null);
              }}
              className={language === l.id ? pillOn : pillOff}
            >
              {l.label}
            </button>
          ))}
          <span className="text-[13px] text-muted">Java, C++, Go and Rust don&apos;t run here; explain them in your approach.</span>
        </div>

        <CodeEditor value={code} language={language} onChange={setCode} label={`${problem.title} code editor, ${langLabel(language)}`} />

        <ActionBar runKey="examples" runLabel="Run examples" running={running} disabled={disabled} busy={busy} passed={passedAll} onRun={runExamples} onSubmit={submit} onStop={stop} onHint={hint} onSkip={onSkip} />

        <StatusLine text={statusText} result={showResult} ok={passedAll} />

        {runError && (
          <p role="alert" className="rounded-[14px] border border-border bg-bg-soft p-4 text-[15px] text-bad">
            <strong>Could not run.</strong> {runError}
          </p>
        )}

        {rows && (
          <ul className="space-y-3" aria-label="Example results">
            {rows.map((r, i) => (
              <li key={i} className={`${cardCls} p-4 text-[15px]`}>
                <p className={`font-semibold ${r.pass ? "text-tool-strong" : "text-text"}`}>
                  Example {i + 1}: {r.pass ? "Passed" : "Did not match"}
                </p>
                <dl className="mt-2 space-y-1">
                  {(
                    [
                      ["Input", r.input],
                      ["Expected", r.expected],
                      ["Got", r.got],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="flex flex-wrap gap-x-2">
                      <dt className="text-muted">{k}</dt>
                      <dd className="min-w-0 break-all font-mono">{v}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        )}

        {logs && (
          <div>
            <p className="text-[15px] text-muted">Printed output</p>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-[14px] border border-border bg-bg-soft p-3 font-mono text-[14px]">{logs}</pre>
          </div>
        )}

        <HintList hints={hints} />

        <FinishStep submitted={!!submitted} passed={passedAll} what="code" disabled={disabled} busy={busy} onFinish={finish} />
      </div>
    </div>
  );
}
