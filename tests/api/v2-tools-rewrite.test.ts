import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { parseMulti, styleLines } from "@/lib/server/rewrite";
import { DEFAULT_TAILOR_V2 } from "@/lib/tiers/types";
import { groqOk, req } from "./helpers";

const h = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: h.create } };
  },
}));

import { POST } from "@/app/api/rewrite/route";

const body = {
  text: "Built a website for a student club",
  posting: { company: "Acme", role: "Web Intern", description: "Must know React. TypeScript is a plus." },
};
let ip = 0;
const call = (b: unknown) => POST(req("rewrite", b, { ip: `15.0.0.${++ip}` }));

beforeEach(() => {
  resetServerState();
  h.create.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("ALLOWED_ORIGINS", "");
});

describe("rewrite v2: three options", () => {
  it("asks for strict JSON once and returns options + heldBack", async () => {
    h.create.mockReturnValue(
      groqOk(
        JSON.stringify({
          options: [
            { label: "closest", text: "Built a club website" },
            { label: "results_first", text: "Built a website for a student club" }, // same as original: dropped
            { label: "posting_words", text: "**Built** a web page for a student club" },
          ],
          held_back: ["React", "TypeScript", ""],
        }),
      ),
    );
    const json = await (await call({ ...body, count: 3, facts: ["HTML"], options: DEFAULT_TAILOR_V2 })).json();
    expect(json.status).toBe("done");
    expect(json.data.options).toEqual(["Built a club website", "Built a web page for a student club"]);
    expect(json.data.text).toBe("Built a club website");
    expect(json.data.heldBack).toEqual(["React", "TypeScript"]);
    expect(h.create).toHaveBeenCalledTimes(1);
    const params = h.create.mock.calls[0][0];
    expect(params.response_format?.type).toBe("json_schema");
    const user = params.messages[1].content as string;
    expect(user).toContain("USER FACTS:\n- HTML");
    expect(user).toContain("No buzzwords");
  });

  it("fails cleanly on unusable JSON", async () => {
    h.create.mockReturnValue(groqOk("not json"));
    const json = await (await call({ ...body, count: 3 })).json();
    expect(json.status).toBe("failed");
  });

  it.each([
    ["count 2", { count: 2 }],
    ["facts not array", { facts: "React" }],
    ["too many facts", { facts: Array.from({ length: 13 }, (_, i) => `t${i}`) }],
    ["long fact", { facts: ["x".repeat(61)] }],
    ["bad level", { options: { ...DEFAULT_TAILOR_V2, level: "ceo" } }],
    ["bad region", { options: { ...DEFAULT_TAILOR_V2, region: "mars" } }],
    ["postingWords not bool", { options: { ...DEFAULT_TAILOR_V2, postingWords: "yes" } }],
  ])("rejects %s (400)", async (_n, extra) => {
    expect((await call({ ...body, ...extra })).status).toBe(400);
    expect(h.create).not.toHaveBeenCalled();
  });
});

describe("rewrite v2 helpers", () => {
  it("parseMulti caps options at 3 and heldBack at 8", () => {
    const raw = JSON.stringify({
      options: ["a", "b", "c", "d"].map((t) => ({ label: "closest", text: `Did ${t}` })),
      held_back: Array.from({ length: 10 }, (_, i) => `k${i}`),
    });
    const m = parseMulti(raw, "orig")!;
    expect(m.options).toHaveLength(3);
    expect(m.heldBack).toHaveLength(8);
  });

  it("v1 options add no v2 style lines", () => {
    const v1 = styleLines({ emphasis: [], tone: "confident", strength: "light", keepLength: true });
    expect(v1.join(" ")).not.toMatch(/buzzword|posting's word/i);
    expect(styleLines(DEFAULT_TAILOR_V2).length).toBeGreaterThan(v1.length);
  });
});
