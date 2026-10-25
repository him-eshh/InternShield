// Fix pass: report banner copy, posting section states, profile chip, evidence wrapping and print.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EvidenceCard from "@/components/report/EvidenceCard";
import PostingSection from "@/components/report/PostingSection";
import Report from "@/components/report/Report";
import { fixtureOutcome } from "@/fixtures/outcome";
import { realReport, scamReport } from "@/fixtures/reports";
import QuickQuestions from "@/components/report/QuickQuestions";
import type { Answers, Question, QuestionId } from "@/lib/types";

describe("report banner", () => {
  it("says the result is incomplete when the message could not be read", async () => {
    const fx = (await fixtureOutcome("real"))!;
    const outcome = { ...fx.outcome, steps: { ...fx.outcome.steps, extract: { status: "failed" as const, reason: "timeout" as const } }, retryable: ["extract" as const] };
    const html = renderToStaticMarkup(<Report outcome={outcome} input={fx.input} onRetry={() => {}} onAgain={() => {}} />);
    expect(html).toContain("We couldn&#x27;t read the message, so this result is incomplete.");
    expect(html).toContain("Retry");
  });

  it("keeps each banner variant to one short sentence", async () => {
    const fx = (await fixtureOutcome("medium"))!;
    const html = renderToStaticMarkup(<Report outcome={fx.outcome} input={fx.input} onRetry={() => {}} onAgain={() => {}} />);
    expect(html).toContain("We&#x27;re busy. Try again in a moment.");
    expect(html).not.toContain("The checks that finished are below");
  });
});

describe("QuickQuestions confirmation placement", () => {
  const qs = [
    { id: "source", text: "First question?", options: [{ value: "a", label: "Opt A" }, { value: "b", label: "Opt A" }] },
    { id: "stage", text: "Second question?", options: [{ value: "c", label: "Opt C" }, { value: "d", label: "Opt C" }] },
  ] as unknown as Question[];
  const render = (answers: Answers, lastId: QuestionId | null) =>
    renderToStaticMarkup(<QuickQuestions questions={qs} answers={answers} change={null} lastId={lastId} onAnswer={() => {}} />);

  it("keeps the same heading before and after answering", () => {
    expect(render({}, null)).toContain("A few quick questions");
    expect(render({ source: "a" } as unknown as Answers, "source" as QuestionId)).toContain("A few quick questions");
  });
  it("moves the confirmation under the most recently answered question", () => {
    const first = render({ source: "a" } as unknown as Answers, "source" as QuestionId);
    expect(first.indexOf("Added: answer.")).toBeGreaterThan(first.indexOf("Opt A"));
    expect(first.indexOf("Added: answer.")).toBeLessThan(first.indexOf("Second question?"));
    const both = render({ source: "a", stage: "c" } as unknown as Answers, "stage" as QuestionId);
    expect(both.match(/Added: answer\./g)).toHaveLength(2); // visible line plus the screen-reader live region
    expect(both.indexOf("Added: answer.")).toBeGreaterThan(both.indexOf("Opt C"));
  });
});

describe("PostingSection", () => {
  it("says it could not check when the step did not run", () => {
    const html = renderToStaticMarkup(<PostingSection checked={false} posting={null} match={null} company="Acme" careersUrl={null} />);
    expect(html).toContain("We couldn&#x27;t check the posting.");
    expect(html).not.toContain("find this role");
  });
  it("says it could not find the role only when the search ran", () => {
    const html = renderToStaticMarkup(<PostingSection checked posting={null} match={null} company="Acme" careersUrl={null} />);
    expect(html).toContain("find this role");
  });
});

describe("EvidenceCard", () => {
  it("wraps long quotes and is never hidden (no scroll-reveal, so print and reduced motion see it)", () => {
    const flag = { ...(scamReport.flags[0] ?? realReport.flags[0]), quote: "reach me at a.very.long.address.that.keeps.going@example-company-name.com" };
    const html = renderToStaticMarkup(<ul><EvidenceCard flag={flag} /></ul>);
    expect(html).toContain("[overflow-wrap:anywhere]");
    expect(html).not.toContain("opacity-0");
  });
});
