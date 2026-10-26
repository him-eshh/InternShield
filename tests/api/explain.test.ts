import { beforeEach, describe, expect, it, vi } from "vitest";
import { fallbackExplanation, hasBannedWord } from "@/lib/explainFallback";
import type { ExplainRequest } from "@/lib/types";
import { groqOk, req } from "./helpers";

const h = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: h.create } };
  },
}));

import { POST } from "@/app/api/explain/route";

const input: ExplainRequest = {
  level: "high",
  flags: [
    { title: "Asks you to deposit a check", quote: "Once you deposit the check", why: "Fake check scams are common." },
    { title: "Moves you to WhatsApp", quote: "add our hiring manager on WhatsApp", why: "Private chats are hard to verify." },
  ],
};
let ip = 0;
const call = (body: unknown = input) => POST(req("explain", body, { ip: `13.0.0.${++ip}` }));

beforeEach(() => {
  h.create.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("ALLOWED_ORIGINS", "");
});

describe("explain route", () => {
  it("returns deterministic explanation from the supplied flags", async () => {
    const { status, data } = await (await call()).json();
    expect(status).toBe("done");
    expect(data.source).toBe("fallback");
    expect(data.text).toBe(fallbackExplanation(input));
    expect(data.text).toMatch(/Fake check scams are common|Private chats are hard to verify/i);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("does not expose invented model claims or unrelated raw message text", async () => {
    h.create.mockReturnValue(groqOk('The recruiter asked for a passport and wrote "Send your passport now".'));
    const { data } = await (await call({ ...input, message: "SECRET RAW MESSAGE" })).json();
    expect(data.source).toBe("fallback");
    expect(data.text).not.toMatch(/passport|SECRET RAW MESSAGE/);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("returns a careful explanation when no flags were found", async () => {
    const { data } = await (await call({ level: "low", flags: [] })).json();
    expect(data.source).toBe("fallback");
    expect(data.text).toMatch(/doesn't prove it's genuine/i);
    expect(hasBannedWord(data.text)).toBe(false);
  });

  it("rejects an invalid level (400)", async () => {
    expect((await call({ level: "safe", flags: [] })).status).toBe(400);
  });
});

describe("fallbackExplanation", () => {
  it("never contains a banned word, for any level", () => {
    for (const level of ["low", "medium", "high"] as const) {
      expect(hasBannedWord(fallbackExplanation({ level, flags: [] }))).toBe(false);
      expect(hasBannedWord(fallbackExplanation({ level, flags: input.flags }))).toBe(false);
    }
  });

  it("uses only the scored flag reasons, never a title-based guess", () => {
    const text = fallbackExplanation({
      level: "medium",
      flags: [...input.flags, { title: "Requests payment", quote: null, why: "The message requests money before work starts" }],
    });
    expect(text).toMatch(/Fake check scams are common/);
    expect(text).toMatch(/Private chats are hard to verify/);
    expect(text).toMatch(/requests money before work starts/);
    expect(text).not.toMatch(/pay sounds unusually high/i);
  });
});
