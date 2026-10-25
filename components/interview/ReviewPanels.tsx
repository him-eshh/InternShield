"use client";
// What the learner sees after answering: test results first (coding, SQL), then feedback matched to the question type.
import { Check, CheckCircle2, CircleAlert, Minus } from "lucide-react";
import type { Current } from "@/lib/tiers/session";
import { questionType, reviewChecks, TYPE_LABEL } from "@/lib/tiers/sessionFeedback";

const box = "rounded-2xl border border-border bg-card p-5";
const compact = (v: string, max = 160) => (v.length > max ? `${v.slice(0, max - 1)}…` : v);

/** Hidden-test (or query) result, the first failing case, and the submitted code. Shown before any approach feedback. */
export function TestResults({ c }: { c: Current }) {
  const code = c.code;
  if (!code) return null;
  const sql = code.language === "sql";
  const ok = code.passed === code.total;
  const fail = code.detail?.failed;
  const runs = c.inner?.stats?.runsBeforeSubmit ?? 0;
  const Icon = ok ? CheckCircle2 : CircleAlert;
  return (
    <section aria-labelledby="results-title" className={`${box} ${ok ? "border-tool" : ""}`}>
      <h2 id="results-title" className="text-sm font-semibold text-tool-strong">{sql ? "Query result" : "Test results"}</h2>
      <p className="mt-2 flex items-center gap-2.5 font-display text-2xl">
        <Icon size={24} aria-hidden="true" className={ok ? "text-tool-strong" : "text-muted"} />
        {sql ? (ok ? "Your result matches the expected rows" : "Your result does not match the expected rows") : `${code.passed} of ${code.total} hidden tests passed`}
      </p>
      {!sql && code.total > 1 && (
        <div className="mt-3 flex gap-1" role="img" aria-label={`${code.passed} of ${code.total} tests passed`}>
          {Array.from({ length: code.total }, (_, i) => <span key={i} className={`h-2 min-w-0 flex-1 rounded-full ${i < code.passed ? "bg-tool" : "bg-bg-soft border border-border"}`} />)}
        </div>
      )}
      {fail && (
        <div className="mt-4 rounded-xl bg-bg-soft p-4 text-[15px]">
          <p className="font-semibold">First failing case</p>
          <dl className="mt-2 space-y-1">
            {([["Input", fail.input], ["Expected", fail.expected], ["Got", fail.got]] as const).map(([k, v]) => (
              <div key={k} className="flex flex-wrap gap-x-2"><dt className="text-muted">{k}</dt><dd className="min-w-0 break-all font-mono">{compact(v)}</dd></div>
            ))}
          </dl>
        </div>
      )}
      {sql && !ok && (code.detail?.message || code.detail?.diffs?.length) && (
        <div className="mt-4 rounded-xl bg-bg-soft p-4 text-[15px]">
          {code.detail?.message && <p className="font-semibold">{code.detail.message}</p>}
          {!!code.detail?.diffs?.length && <ul className="mt-2 space-y-1 font-mono text-[14px]">{code.detail.diffs.map((d, i) => <li key={i} className="break-all">{d}</li>)}</ul>}
        </div>
      )}
      <p className="mt-3 text-sm text-muted">{runs > 0 ? `Ran the examples ${runs} ${runs === 1 ? "time" : "times"} before submitting` : "Submitted without running the examples"} · {c.hints.length} {c.hints.length === 1 ? "hint" : "hints"} used</p>
      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-tool-strong">Show your {sql ? "query" : "code"}</summary>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-bg-soft p-3 font-mono text-[13px]">{code.code}</pre>
      </details>
    </section>
  );
}

const STAR_LABELS = [["situation", "Situation"], ["task", "Task"], ["action", "Action"], ["result", "Result"]] as const;

/** Feedback for the question's type: code review, SQL review or STAR. Test results are shown above, so they are not repeated. */
export function FeedbackCard({ c }: { c: Current }) {
  const fb = c.feedback;
  const type = questionType(c.item);
  const checks = reviewChecks(c).filter((k) => !(k.id === "tests" && c.code));
  const star = type === "behavioral" ? fb?.star : null;
  return (
    <section className={box} aria-live="polite">
      <h2 className="flex items-center gap-2 font-display text-xl"><CheckCircle2 size={20} aria-hidden="true" className="text-tool-strong" />{TYPE_LABEL[type]}</h2>
      {fb && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><h3 className="text-sm font-semibold text-tool-strong">What worked</h3><p className="mt-1">{fb.strength}</p></div>
          <div><h3 className="text-sm font-semibold">Try this next</h3><p className="mt-1">{fb.improve}</p></div>
        </div>
      )}
      {star && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="STAR parts">
          {STAR_LABELS.map(([k, label]) => <li key={k} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${star[k] ? "border-tool bg-tool-tint text-tool-strong" : "border-border text-muted"}`}>{star[k] ? <Check size={14} aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />}{label}<span className="sr-only">{star[k] ? " covered" : " missing"}</span></li>)}
        </ul>
      )}
      {fb?.quote && <blockquote className="mt-4 border-l-2 border-tool pl-4 text-sm text-muted">“{fb.quote}”</blockquote>}
      {!!checks.length && (
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">{type === "coding" ? "Code checks" : type === "sql" ? "SQL checks" : type === "behavioral" ? "Story checks" : "Answer checks"}</h3>
          <ul className="mt-2 space-y-2">
            {checks.map((k) => <li key={k.id} className="flex items-start gap-2 text-[15px]">{k.ok ? <CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-tool-strong" /> : <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />}<span><span className="sr-only">{k.ok ? "Done: " : "To improve: "}</span>{k.text}</span></li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
