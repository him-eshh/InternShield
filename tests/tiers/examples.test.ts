// Tier merge gate: both "Try an example" flows still land in their levels from saved results (no live calls).
import { describe, expect, it } from "vitest";
import { runPipeline } from "@/lib/client/pipeline";
import { EXAMPLES } from "@/lib/examples";

const failAll = (async () =>
  new Response(JSON.stringify({ status: "failed", reason: "error" }), { status: 500 })) as typeof fetch;

describe("Try an example flows", () => {
  it.each([
    ["scam", "high"],
    ["real", "low"],
  ] as const)("%s lands in %s using saved results", async (id, level) => {
    const ex = EXAMPLES[id];
    const out = await runPipeline(
      { text: ex.text, form: ex.form, source: ex.source, stage: ex.stage, profile: null, resumeText: null, exampleId: id },
      { onLine: () => {}, fetch: failAll, log: false, failParam: null },
    );
    expect(out.usedSaved).toBe(true);
    expect(out.report?.level).toBe(level);
  });
});
