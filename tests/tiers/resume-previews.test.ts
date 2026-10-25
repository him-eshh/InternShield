import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseTextResume } from "@/lib/tiers/resumeModel";
import type { ResumeEdit } from "@/lib/tiers/resumeTypes";
const h = vi.hoisted(() => ({ rendered: [] as Uint8Array[], current: new Uint8Array() as Uint8Array, workerDestroyed: vi.fn(), taskDestroyed: vi.fn(), render: vi.fn() }));
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  PDFWorker: class { destroy = h.workerDestroyed; },
  getDocument: ({ data }: { data: Uint8Array }) => {
    h.current = data; h.rendered.push(data);
    return { destroy: h.taskDestroyed, promise: Promise.resolve({ numPages: 1, getPage: async () => ({
      getViewport: ({ scale }: { scale: number }) => ({ width: 612 * scale, height: 792 * scale }),
      render: () => ({ promise: Promise.resolve() }),
    }) }) };
  },
}));
vi.mock("@/lib/tiers/resumeRender", async (original) => {
  const actual = await original<typeof import("@/lib/tiers/resumeRender")>();
  return { ...actual, renderEdited: h.render };
});
import { prepareResumePreviews, previewKey, type ResumeFile } from "@/lib/client/resumeEditor";

const edits: ResumeEdit[] = [0, 1].map((n) => ({ id: `e${n}`, lineId: `l${n}`, lineIndex: n, section: "", original: "Built a small website for the team.", proposed: "Built a website for the team.", reason: "Shorter", keywords: [], status: "pending" }));
const makeFile = (): ResumeFile => ({ doc: { ...parseTextResume("- Built a small website for the team.\n- Built a small website for the team."), source: "pdf" }, bytes: new Uint8Array([1, 2]), name: "demo.pdf" });
beforeEach(() => {
  h.rendered = []; h.workerDestroyed.mockReset(); h.taskDestroyed.mockReset(); h.render.mockReset();
  h.render.mockImplementation(async (_doc, _bytes, selected) => ({ bytes: new TextEncoder().encode(JSON.stringify(selected)), mime: "application/pdf", ext: "pdf", pageCount: 1, rejected: [] }));
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ({}), toDataURL: () => `data:image/png;base64,${Buffer.from(h.current).toString("base64")}` }) });
});

afterEach(() => vi.unstubAllGlobals());

describe("prepared byte-matched PDF previews", () => {
  it("prepares each accepted/rejected combination from exactly its downloadable bytes", async () => {
    const file = makeFile();
    await prepareResumePreviews(file, edits, new AbortController().signal);
    expect(file.previews?.size).toBe(4);
    for (const selected of [[], [edits[0]], [edits[1]], edits]) {
      const prepared = file.previews!.get(previewKey(selected))!;
      expect(prepared).toBeDefined();
      expect(prepared.pages[0].dataUrl).toBe(`data:image/png;base64,${Buffer.from(prepared.output.bytes).toString("base64")}`);
      expect(h.rendered.some((data) => Buffer.from(data).equals(Buffer.from(prepared.output.bytes)))).toBe(true);
    }
    expect(h.taskDestroyed).toHaveBeenCalledTimes(4);
    expect(h.workerDestroyed).toHaveBeenCalledOnce();
  });
  it("reuses existing byte/image pairs and invalidates changed wording only", async () => {
    const file = makeFile();
    await prepareResumePreviews(file, edits, new AbortController().signal);
    const original = file.previews!.get(previewKey([edits[0]]));
    h.render.mockClear();
    await prepareResumePreviews(file, edits, new AbortController().signal);
    expect(h.render).not.toHaveBeenCalled();
    expect(file.previews!.get(previewKey([edits[0]]))).toBe(original);
    await prepareResumePreviews(file, [{ ...edits[0], proposed: "Built a small website." }, edits[1]], new AbortController().signal);
    expect(h.render).toHaveBeenCalledTimes(2);
  });
  it("cancels without publishing a partial preview map and bounds the edit count", async () => {
    const file = makeFile();
    const controller = new AbortController(); controller.abort();
    await expect(prepareResumePreviews(file, edits, controller.signal)).rejects.toThrow();
    expect(file.previews).toBeUndefined();
    expect(h.workerDestroyed).toHaveBeenCalledOnce();
    await expect(prepareResumePreviews(file, Array.from({ length: 7 }, () => edits[0]), new AbortController().signal)).rejects.toThrow(/six/);
  });
});
