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
    expect(html).toContain("A few quick questions");
    expect(html).not.toContain("Thanks for answering");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Thanks, we updated the score. Score went down.");
    // The thanks comes after the questions and their answers, not above them.
    const lastQuestion = html.lastIndexOf(escape(questions[questions.length - 1].text));
    expect(html.indexOf("Thanks, we updated the score.")).toBeGreaterThan(lastQuestion);
  });

  it("says so when an answer didn't move the score, below the answered question", () => {
    const answers = { [questions[0].id]: questions[0].options[0].value } as Answers;
    const html = renderToStaticMarkup(<QuickQuestions questions={questions} answers={answers} change={null} onAnswer={() => {}} />);
    const msg = escape("Thanks, your answer didn't change the score.");
    expect(html).toContain(msg);
    expect(html.indexOf(msg)).toBeGreaterThan(html.lastIndexOf(escape(questions[questions.length - 1].text)));
  });

  it("keeps the status line hidden and empty before any answer", () => {
    const html = renderToStaticMarkup(<QuickQuestions questions={questions} answers={{}} change={null} onAnswer={() => {}} />);
    expect(html).not.toContain("Thanks,");
    expect(html).toContain('class="sr-only"');
  });
});
