import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Explanation from "@/components/report/Explanation";
import { spottedSkills } from "@/lib/client/resume";

describe("spottedSkills", () => {
  it("matches whole words case-insensitively and keeps candidate casing", () => {
    expect(spottedSkills("I know python and sql.", ["Python", "SQL", "Java"])).toEqual(["Python", "SQL"]);
  });
  it("does not match inside other words", () => {
    expect(spottedSkills("I wrote JavaScript daily", ["Java"])).toEqual([]);
  });
  it("dedupes candidates and caps at 6", () => {
    const list = ["a1", "b1", "c1", "d1", "e1", "f1", "g1", "A1"];
    expect(spottedSkills("a1 b1 c1 d1 e1 f1 g1", list)).toEqual(["a1", "b1", "c1", "d1", "e1", "f1"]);
    expect(spottedSkills("Python", ["Python", "python"])).toEqual(["Python"]);
  });
  it("handles special characters and empty input", () => {
    expect(spottedSkills("Used C++ at work", ["C++"])).toEqual(["C++"]);
    expect(spottedSkills("", ["Python"])).toEqual([]);
  });
});

describe("Explanation", () => {
  it("renders at most 2 paragraphs", () => {
    const html = renderToStaticMarkup(<Explanation text={"One.\n\nTwo.\n\nThree.\n\nFour."} quotes={[]} />);
    expect(html.match(/<p/g)?.length).toBe(2);
    expect(html).toContain("Two.");
    expect(html).not.toContain("Three.");
  });
});
