import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CheckForm, { messageIssue, type CheckSubmit } from "@/components/CheckForm";

const noop = () => {};

describe("CheckForm (C8)", () => {
  it("keeps Check it enabled when the box is empty", () => {
    const html = renderToStaticMarkup(<CheckForm initial={null} onSubmit={noop} />);
    const btn = html.match(/<button type="submit"[^>]*>/)?.[0] ?? "";
    expect(btn).not.toBe("");
    expect(btn).not.toMatch(/\sdisabled(=|\s|>)/); // the attribute, not Tailwind's disabled: variant
    expect(html).not.toContain("Paste a message first");
  });

  it("flags empty and too-short text with an inline hint, accepts real text", () => {
    expect(messageIssue("")).toMatch(/paste/i);
    expect(messageIssue("   ")).toMatch(/paste/i);
    expect(messageIssue("hi")).toMatch(/too short/i);
    expect(messageIssue("Hi, we would like to offer you an internship role.")).toBeNull();
  });

  it("folds context pills into a collapsed disclosure", () => {
    const html = renderToStaticMarkup(<CheckForm initial={null} onSubmit={noop} />);
    const open = html.match(/<details[^>]*>/)?.[0] ?? "";
    expect(open).not.toBe("");
    expect(open).not.toMatch(/\sopen/);
    expect(html).toContain("Add context");
  });

  it("hides sender and company until autofill or Add details", () => {
    const empty = renderToStaticMarkup(<CheckForm initial={null} onSubmit={noop} />);
    expect(empty).not.toContain('id="sender"');
    expect(empty).not.toContain('id="company"');
    expect(empty).toContain("Add details");

    const init: CheckSubmit = { text: "x".repeat(40), form: { sender: "a@b.com", company: "Acme" }, source: null, stage: null, exampleId: null };
    const filled = renderToStaticMarkup(<CheckForm initial={init} onSubmit={noop} />);
    expect(filled).toContain('id="sender"');
    expect(filled).toContain('id="company"');
    expect(filled).not.toContain("Add details");
  });

  it("never uses verdict words", () => {
    const html = renderToStaticMarkup(<CheckForm initial={null} onSubmit={noop} />);
    expect(html).not.toMatch(/\b(safe|legit|guaranteed)\b/i);
  });
});
