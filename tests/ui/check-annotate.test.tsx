// C6: annotated message view and its two-way links with the evidence cards.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AnnotatedMessage from "@/components/report/AnnotatedMessage";
import EvidenceList from "@/components/report/EvidenceList";
import { annotate } from "@/lib/client/annotate";
import { goods, reds } from "@/lib/reportView";
import type { Flag } from "@/lib/types";

const flag = (id: string, kind: "red" | "good", title: string, quote: string | null): Flag => ({
  id,
  group: "message",
  kind,
  title,
  quote,
  why: "Because.",
  points: kind === "red" ? 10 : -5,
  critical: false,
  severity: "high",
});

const TEXT = "Hi Sam, reply today or lose the spot. Pay a $50 fee for equipment. Our team at Northbeam is hiring.";
const FLAGS = [
  flag("rushing", "red", "They're rushing you", "reply today or lose the spot"),
  flag("fee", "red", "Asks for money", "Pay a $50 fee"),
  flag("named", "good", "Names the team", "Our team at Northbeam"),
  flag("none", "red", "No quote here", null),
];

function render(flags: Flag[], text = TEXT) {
  const ordered = [...reds(flags), ...goods(flags)];
  const annotated = annotate(text, ordered);
  const numbers = Object.fromEntries(annotated.marks.map((m) => [m.flagId, m.n]));
  const html = renderToStaticMarkup(
    <>
      <AnnotatedMessage text={text} flags={ordered} annotated={annotated} />
      <EvidenceList flags={flags} level="medium" numbers={numbers} />
    </>,
  );
  return { html, annotated, numbers };
}

describe("AnnotatedMessage", () => {
  it("renders numbered, labelled marks and the title", () => {
    const { html } = render(FLAGS);
    expect(html).toContain("Your message");
    expect(html).toContain('aria-label="Red flag 1: They&#x27;re rushing you. Go to evidence"');
    expect(html).toContain('aria-label="Good sign 3: Names the team. Go to evidence"');
    expect(html).toContain("am-good");
    expect(html).toContain("am-red");
  });

  it("marks link to cards that carry the matching ids, and cards link back", () => {
    const { html, annotated } = render(FLAGS);
    for (const m of annotated.marks) {
      expect(html).toContain(`href="#flag-${m.flagId}"`);
      expect(html).toContain(`id="flag-${m.flagId}"`);
      expect(html).toContain(`id="mk-${m.flagId}"`);
    }
    expect(html).toContain('tabindex="-1"');
    expect(html.match(/Show in message/g)).toHaveLength(3);
    expect(html).not.toContain('id="mk-none"');
  });

  it("renders nothing when no quote is located", () => {
    const { html } = render([flag("a", "red", "A", "text that is not in the message"), flag("b", "red", "B", null)]);
    expect(html).not.toContain("Your message");
    expect(html).not.toContain("Show in message");
  });

  it("renders overlapping quotes with both numbers", () => {
    const flags = [flag("one", "red", "One", "reply today or lose"), flag("two", "red", "Two", "today or lose the spot")];
    const { html, numbers } = render(flags);
    expect(Object.keys(numbers)).toHaveLength(2);
    expect(html).toContain('id="mk-one"');
    expect(html).toContain('id="mk-two"');
  });

  it("collapses long messages behind a Show all button", () => {
    const long = `${TEXT}\n${"More filler text to make this message long. ".repeat(30)}`;
    const { html } = render(FLAGS, long);
    expect(html).toContain('data-collapsed="true"');
    expect(html).toContain("Show all");
    expect(html).toContain('aria-expanded="false"');
    expect(render(FLAGS).html).not.toContain("Show all");
  });
});
