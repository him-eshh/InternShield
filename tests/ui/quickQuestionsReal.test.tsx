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

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

describe("QuickQuestions with real engine output", () => {
  const { questions } = report;

  // v2: the top question is open with its options; the rest wait behind "+N more".
  it("renders the top question the engine asked, with its options, and '+N more'", () => {
    expect(questions.length).toBeGreaterThan(1);
    const html = renderToStaticMarkup(<QuickQuestions questions={questions} answers={{}} change={null} onAnswer={() => {}} />);
    expect(html).toContain(escape(questions[0].text));
    for (const o of questions[0].options) expect(html).toContain(escape(o.label));
    expect(html).not.toContain(escape(questions[1].text));
    expect(html).toContain(`+${questions.length - 1} more`);
    expect(html).toContain("A few quick questions");
    expect(html).not.toContain("Answer ");
  });

  it("shows the thanks under the last answered question, never above", () => {
    const last = questions[questions.length - 1];
    const answers = Object.fromEntries(questions.map((q) => [q.id, q.options[0].value])) as Answers;
    const html = renderToStaticMarkup(<QuickQuestions questions={questions} answers={answers} change="Score went down." lastId={last.id} onAnswer={() => {}} />);
    expect(html).toContain("A few quick questions");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Thanks. Score went down.");
    const thanks = html.indexOf("Thanks. Score went");
    const lastOption = html.lastIndexOf(escape(last.options[last.options.length - 1].label), thanks);
    expect(lastOption).toBeGreaterThan(html.indexOf(escape(last.text)));
    expect(thanks).toBeGreaterThan(lastOption);
  });

  it("says so when an answer didn't move the score, below the answered question", () => {
    const answers = { [questions[0].id]: questions[0].options[0].value } as Answers;
    const html = renderToStaticMarkup(<QuickQuestions questions={questions} answers={answers} change={null} lastId={questions[0].id} onAnswer={() => {}} />);
    const msg = escape("Thanks. The score didn't change.");
    expect(html).toContain(msg);
    expect(html.indexOf(msg)).toBeGreaterThan(html.indexOf(escape(questions[0].text)));
  });

  it("shows nothing before any answer, and keeps one empty live region", () => {
    const html = renderToStaticMarkup(<QuickQuestions questions={questions} answers={{}} change={null} onAnswer={() => {}} />);
    expect(html).not.toContain("Thanks");
    expect(html.match(/role="status"/g)).toHaveLength(1);
  });
});
