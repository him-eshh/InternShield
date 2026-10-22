import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { cleanTranscript, dedupeTranscript } from "@/lib/server/transcribe";
import { groqOk, req } from "./helpers";

const h = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: h.create } };
  },
}));

import { POST } from "@/app/api/transcribe/route";

describe("review: repeated sender headers keep the message", () => {
  it("never cuts at a repeated sender header, so a later payment ask survives", () => {
    const chat = [
      "Jordan Blake (HR Team)",
      "Hi! Congrats, you got the remote assistant role.",
      "Jordan Blake (HR Team)",
      "Before you start, please buy a $300 equipment kit via Zelle.",
      "Jordan Blake (HR Team)",
      "We'll refund it with your first paycheck.",
    ].join("\n");
    expect(dedupeTranscript(chat)).toBe(chat);
  });
});

const fixture = (name: string) => readFileSync(join(__dirname, "..", "fixtures", "transcripts", `${name}.txt`), "utf8");
const IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

const EXPECTED = [
  "Recruiter · Messages",
  "",
  "Hello Priya,",
  "",
  "Thank you for applying to the Marketing Intern position at Bluefin Outdoors. We reviewed your application and would like to invite you to a first interview.",
  "",
  "The interview is 30 minutes on video with our brand team. Please pick a time using the scheduling link in this email.",
  "",
  "If you have questions, reply to this message and I will get back to you within two business days.",
  "",
  "Best regards,",
  "Marcus Hale",
  "Campus Recruiting, Bluefin Outdoors",
].join("\n");

beforeEach(() => {
  resetServerState();
  h.create.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("ALLOWED_ORIGINS", "");
});

describe("dedupeTranscript", () => {
  it("turns the restart-as-fragments transcript into the email exactly once", () => {
    const out = dedupeTranscript(fixture("multi"));
    expect(out).toBe(EXPECTED);
    expect(out.match(/Recruiter · Messages/g)).toHaveLength(1);
    const long = out.split("\n").map((l) => l.trim().toLowerCase()).filter((l) => l.length >= 12);
    expect(new Set(long).size).toBe(long.length);
  });

  it("also cleans fragments when the restart is not at a clean line", () => {
    const text =
      "Offer details for the role\nPay is $20 an hour for twenty hours every week\nStart date is June 3rd at the main office\nPay is $20 an hour for twenty hours every week\nStart date is June 3rd";
    expect(dedupeTranscript(text)).toBe("Offer details for the role\nPay is $20 an hour for twenty hours every week\nStart date is June 3rd at the main office");
  });

  it("keeps short repeats on purpose: dropping them could hide evidence", () => {
    const text = "Offer details for the role\nPay is $20 an hour\nStart date is June 3rd\nPay is $20 an hour";
    expect(dedupeTranscript(text)).toBe(text);
  });

  it("leaves a short 2-line chat unchanged", () => {
    const s = fixture("short").trim();
    expect(dedupeTranscript(s)).toBe(s);
  });

  it("leaves a long chat of lines that differ only by a number unchanged", () => {
    const s = fixture("long").trim();
    expect(s.split("\n").length).toBeGreaterThan(30);
    expect(dedupeTranscript(s)).toBe(s);
  });

  it("keeps a legitimately repeated short line", () => {
    const s = "Recruiter: Can you start Monday?\nThanks!\nMe: Yes, I can start Monday morning.\nThanks!";
    expect(dedupeTranscript(s)).toBe(s);
    expect(dedupeTranscript("OK\nSee you at the office\nOK\nBring your ID\nOK")).toBe("OK\nSee you at the office\nOK\nBring your ID\nOK");
  });

  it("collapses runs of blank lines and keeps order", () => {
    expect(dedupeTranscript("First line here\n\n\n\n\nSecond line here")).toBe("First line here\n\nSecond line here");
  });

  it("is applied before the length cap", () => {
    expect(cleanTranscript("```\n" + fixture("multi") + "```")).toBe(EXPECTED);
  });
});

describe("transcribe route dedupe", () => {
  it("sends exactly one image per request and returns deduped text", async () => {
    h.create.mockReturnValue(groqOk(fixture("multi")));
    const res = await POST(req("transcribe", { image: IMG }, { ip: "16.0.0.1" }));
    const json = await res.json();
    expect(json.status).toBe("done");
    expect(json.data.text).toBe(EXPECTED);
    expect(h.create).toHaveBeenCalledTimes(1);
    const parts = h.create.mock.calls[0][0].messages[1].content as { type: string }[];
    expect(parts.filter((p) => p.type === "image_url")).toHaveLength(1);
    expect(h.create.mock.calls[0][0].messages[0].content).toContain("exactly once");
  });
});
