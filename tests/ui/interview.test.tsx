import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Tracker from "@/components/tiers/Tracker";
import type { TrackerCard } from "@/lib/tiers/types";

const noop = () => {};

describe("Tracker tool actions", () => {
  const mk = (id: string, column: TrackerCard["column"]): TrackerCard => ({
    id,
    company: `Co${id}`,
    role: "Intern",
    link: null,
    risk: null,
    column,
    notes: "",
    description: null,
    createdAt: 1,
  });
  const cards = [mk("1", "saved"), mk("2", "interviewing")];

  it("shows Practice and Tailor on every card when their handlers are given", () => {
    const html = renderToStaticMarkup(<Tracker onBack={noop} onPractice={noop} onTailor={noop} initialCards={cards} />);
    expect(html.match(/Practice interview/g)?.length).toBe(2);
    expect(html.match(/Tailor resume/g)?.length).toBe(2);
  });
  it("hides it without onPractice", () => {
    const html = renderToStaticMarkup(<Tracker onBack={noop} initialCards={cards} />);
    expect(html).not.toContain("Practice interview");
  });
});
