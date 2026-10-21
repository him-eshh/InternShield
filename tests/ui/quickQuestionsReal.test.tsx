// Slice 7.6: the quick-questions box renders the questions score() returns for a realistic message.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import QuickQuestions from "@/components/report/QuickQuestions";
import { score } from "@/lib/scoring/score";
import type { Answers } from "@/lib/types";
import { facts, input } from "../scoring/helpers";

// Made-up recruiter outreach; no source or stage picked (same case as tests/scoring/questionsReal.test.ts).
const TEXT =
  "Hi Jordan, I'm Priya from the campus recruiting team at Northbeam Analytics. We came across your profile and think " +
  "you could be a great fit for our Summer 2027 Data Analyst Internship. Would you be open to a 20 minute call later " +
  "this week to talk about the team and the role? Thanks, Priya";

const report = score(
  input({
    text: TEXT,
    facts: facts({
      company: { value: "Northbeam Analytics", quote: "Northbeam Analytics" },
      role: { value: "Data Analyst Intern", quote: "Data Analyst Internship" },
    }),
  }),
);

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

describe("QuickQuestions with real engine output", () => {
  const { questions } = report;

  it("renders every question the engine asked, with its options", () => {
    expect(questions.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(<QuickQuestions questions={questions} answers={{}} change={null} onAnswer={() => {}} />);
    for (const q of questions) {
      expect(html).toContain(escape(q.text));
      for (const o of q.options) expect(html).toContain(escape(o.label));
    }
    expect(html).toContain("Where did this message come from?");
    expect(html).toContain(`Answer ${questions.length} quick question`);
  });

  it("shows the thanks line once everything is answered", () => {
    const answers = Object.fromEntries(questions.map((q) => [q.id, q.options[0].value])) as Answers;
    const html = renderToStaticMarkup(<QuickQuestions questions={questions} answers={answers} change="Score went down" onAnswer={() => {}} />);
    expect(html).toContain("Thanks, we updated the result");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Score went down");
  });
});
