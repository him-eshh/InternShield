import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildResumePlan, loadResumePlan } from "@/lib/tiers/resumePlan";
import { PlanPanel } from "@/components/resume/PlanPanel";

const input = { resume: "Built a Python dashboard.", posting: "Required: Python and SQL.\nPreferred: React.", company: "Northwind", role: "Data Intern" };
const intel = { resume: { emphasis: ["Explain your testing choices."] }, values: ["Clear documentation"], sources: [{ label: "Engineering notes", url: "https://northwind.example/engineering" }] };
afterEach(() => vi.unstubAllGlobals());

describe("resume plan", () => {
  it("keeps required and preferred terms and accepted facts separate from company guidance", () => {
    const plan = buildResumePlan({ ...input, facts: ["SQL"] }, intel);
    expect(plan.gap.required.map((t) => [t.term, t.bucket])).toEqual([["Python", "found"], ["SQL", "found"]]);
    expect(plan.gap.preferred.map((t) => t.term)).toEqual(["React"]);
    expect(plan.missing).toEqual(["React"]);
    expect(plan.keywords).not.toContain("Clear documentation");
    expect(plan.limited).toBe(false);
  });
  it("renders linked guidance, role and keyword priorities", () => {
    const html = renderToStaticMarkup(<PlanPanel plan={buildResumePlan(input, intel)} />);
    expect(html).toContain("What we&#x27;ll emphasize");
    expect(html).toContain("Data Intern at Northwind");
    expect(html).toContain('href="https://northwind.example/engineering"');
    expect(html).toContain("Required:");
    expect(html).toContain("Preferred:");
  });
  it("labels role-only context truthfully when no posting was provided", () => {
    const plan = buildResumePlan({ ...input, posting: "" });
    const html = renderToStaticMarkup(<PlanPanel plan={plan} />);
    expect(html).toContain("Using the company and role details only");
    expect(html).not.toContain("job post only");
    expect(html).not.toContain("Required:");
  });
  it.each([undefined, { ...intel, limited: true }, { ...intel, sources: [] }, { ...intel, sources: [{ label: "bad", url: "javascript:alert(1)" }] }])("falls back without unverified claims when unavailable or capped", (data) => {
    const plan = buildResumePlan(input, data);
    expect(plan.limited).toBe(true);
    expect(plan.emphasis).toEqual([]);
    expect(plan.sources).toEqual([]);
    expect(plan.keywords).toContain("Python");
    expect(renderToStaticMarkup(<PlanPanel plan={plan} />)).toContain("Using the job post only");
  });
  it("posts only company/role to the cached resume intel endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ status: "done", data: intel }));
    vi.stubGlobal("fetch", fetcher);
    expect((await loadResumePlan(input)).limited).toBe(false);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("/api/intel");
    expect(JSON.parse(options.body)).toEqual({ company: "Northwind", role: "Data Intern", kind: "resume" });
  });
  it("does not request intel without a company and falls back on HTTP/network errors", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    expect((await loadResumePlan({ ...input, company: "" })).limited).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
    expect((await loadResumePlan(input)).limited).toBe(true);
    fetcher.mockRejectedValue(new Error("offline"));
    expect((await loadResumePlan(input)).limited).toBe(true);
  });
  it("propagates cancellation instead of continuing to draft edits", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", vi.fn());
    await expect(loadResumePlan(input, controller.signal)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
