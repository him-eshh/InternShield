import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CheckForm, { messageIssue, type CheckSubmit } from "@/components/CheckForm";

const noop = () => {};

describe("CheckForm (C8)", () => {
  it("explains why checking is unavailable until a message is pasted", () => {
    const html = renderToStaticMarkup(<CheckForm initial={null} onSubmit={noop} />);
    const btn = html.match(/<button type="submit"[^>]*>/)?.[0] ?? "";
    expect(btn).not.toBe("");
    expect(btn).toMatch(/\sdisabled(=|\s|>)/);
    expect(html).toContain("Check this message");
    expect(html).toContain('id="submit-reason"');
    expect(html).toContain("Paste a message to check.");
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
    expect(html).toContain("More context");
  });

  it("hides sender and company until autofill or Add sender and company", () => {
    const empty = renderToStaticMarkup(<CheckForm initial={null} onSubmit={noop} />);
    expect(empty).not.toContain('id="sender"');
    expect(empty).not.toContain('id="company"');
    expect(empty).toContain("Add sender and company");

    const init: CheckSubmit = { text: "x".repeat(40), form: { sender: "a@b.com", company: "Acme" }, source: null, stage: null, exampleId: null };
    const filled = renderToStaticMarkup(<CheckForm initial={init} onSubmit={noop} />);
    expect(filled).toContain('id="sender"');
    expect(filled).toContain('id="company"');
    expect(filled).not.toContain("Add sender and company");
  });

  it("never uses verdict words", () => {
    const html = renderToStaticMarkup(<CheckForm initial={null} onSubmit={noop} />);
    expect(html).not.toMatch(/\b(safe|legit|guaranteed)\b/i);
  });
});
