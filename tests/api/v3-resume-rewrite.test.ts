import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { docLines, parseTextResume } from "@/lib/tiers/resumeModel";
const h = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("@/lib/server/groq", () => ({ callGroq: h.call }));
import { POST } from "@/app/api/rewrite/route";

const resume = "Sam Rivera\nEXPERIENCE\n- Built a club website with JavaScript.\nSKILLS\nPython";
const lineId = docLines(parseTextResume(resume)).find((l) => l.kind === "bullet")!.id;
const body = { mode: "edits", resume, posting: "Required: JavaScript. Preferred: React.", company: "Northwind", role: "Web Intern" };
let ip = 0;
const call = (data: unknown = body) => POST(new Request("http://localhost:3100/api/rewrite", {
  method: "POST", headers: { origin: "http://localhost:3100", "content-type": "application/json", "x-forwarded-for": `18.0.0.${++ip}` }, body: JSON.stringify(data),
}));
beforeEach(() => {
  resetServerState(); h.call.mockReset();
  vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3100");
});

describe("v3 rewrite route enforces edits guard", () => {
  it("returns only validated edits with source metadata and neighbors in the prompt", async () => {
    h.call.mockResolvedValue({ ok: true, data: JSON.stringify({ edits: [
      { lineId, proposed: "Built a club website using JavaScript." },
      { lineId: "l0", proposed: "Sam Microsoft" },
      { lineId, proposed: "Built a club website with Rust." },
    ] }) });
    const response = await call();
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.data.edits).toHaveLength(1);
    expect(json.data.edits[0].original).toBe("Built a club website with JavaScript.");
    expect(h.call.mock.calls[0][1].user).toContain('"previous":"EXPERIENCE"');
    expect(h.call.mock.calls[0][1].schema).toBeDefined();
  });
  it("drops an entire unsafe result rather than exposing it to the browser", async () => {
    h.call.mockResolvedValue({ ok: true, data: JSON.stringify({ edits: [{ lineId, proposed: "Spearheaded a robust website at Microsoft in 2026." }] }) });
    expect((await (await call()).json()).data.edits).toEqual([]);
  });
  it("allows a new tool only after the user confirms it", async () => {
    h.call.mockResolvedValue({ ok: true, data: JSON.stringify({ edits: [{ lineId, proposed: "Built a club website using React." }] }) });
    expect((await (await call()).json()).data.edits).toEqual([]);
    expect((await (await call({ ...body, facts: ["React"] })).json()).data.edits).toHaveLength(1);
  });
  it.each([{ ...body, resume: "" }, { ...body, posting: 5 }, { ...body, facts: [5] }, { ...body, company: {} }, { ...body, facts: ["Microsoft"] }, { ...body, facts: ["50%"] }])("rejects malformed requests before calling the model", async (data) => {
    expect((await call(data)).status).toBe(400);
    expect(h.call).not.toHaveBeenCalled();
  });
  it("keeps Word layout by permitting deletions, never new or reordered words", async () => {
    h.call.mockResolvedValueOnce({ ok: true, data: JSON.stringify({ edits: [{ lineId, proposed: "Built a club website using JavaScript." }] }) });
    expect((await (await call({ ...body, source: "docx" })).json()).data.edits).toEqual([]);
    h.call.mockResolvedValueOnce({ ok: true, data: JSON.stringify({ edits: [{ lineId, proposed: "Built a website with JavaScript." }] }) });
    expect((await (await call({ ...body, source: "docx" })).json()).data.edits).toHaveLength(1);
  });

  it("uses the shared rendered-width guard before returning a PDF suggestion", async () => {
    h.call.mockResolvedValue({ ok: true, data: JSON.stringify({ edits: [{ lineId, proposed: "Built a club website using JavaScript." }] }) });
    const box = { pageIndex: 0, x: 20, y: 100, w: 1, h: 10, family: "Helvetica", bold: false, italic: false };
    const data = { ...body, geometry: [{ lineId, boxes: [box] }], guidance: ["Explain your testing choices."] };
    expect((await (await call(data)).json()).data.edits).toEqual([]);
    expect(h.call.mock.calls[0][1].user).toContain("Explain your testing choices.");
    const wide = { ...data, geometry: [{ lineId, boxes: [{ ...box, w: 500 }] }] };
    expect((await (await call(wide)).json()).data.edits).toHaveLength(1);
    expect((await call({ ...body, geometry: [{ lineId, boxes: [{ ...box, w: -1 }] }] })).status).toBe(400);
  });

  it("handles bad JSON and upstream limits without leaking output", async () => {
    h.call.mockResolvedValueOnce({ ok: true, data: "not json" }).mockResolvedValueOnce({ ok: false, reason: "limit", retryAfter: 20 });
    expect((await call()).status).toBe(502);
    expect((await call()).status).toBe(429);
  });
});
