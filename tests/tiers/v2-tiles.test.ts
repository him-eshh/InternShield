import { describe, expect, it } from "vitest";
import { findSeam, fitPayload, mergeTiles, planTiles, rowVariance } from "@/lib/tiers/tiles";

describe("planTiles", () => {
  it("780x5516 gives 2 strips at about 0.89 with readable text", () => {
    const p = planTiles(780, 5516);
    expect(p.tooTall).toBe(false);
    expect(p.tiles).toHaveLength(2);
    expect(p.scale).toBeGreaterThan(0.85);
    expect(p.scale).toBeLessThan(0.95);
    expect(p.scale * 30).toBeGreaterThanOrEqual(16);
    const last = p.tiles[1];
    expect(last.y + last.h).toBe(Math.round(5516 * p.scale));
    expect(p.tiles[0].y + p.tiles[0].h).toBeGreaterThan(p.tiles[1].y + 140); // overlap
  });

  it("1170x2532 is one strip, width capped at 1080", () => {
    const p = planTiles(1170, 2532);
    expect(p.tiles).toHaveLength(1);
    expect(p.tooTall).toBe(false);
    expect(Math.round(1170 * p.scale)).toBe(1080);
  });

  it("1170x12000 asks for a crop instead of unreadable text", () => {
    const p = planTiles(1170, 12000);
    expect(p.tooTall).toBe(true);
    expect(p.tiles).toHaveLength(0);
  });

  it("never exceeds 2 strips and keeps text >= 16 px when it does tile", () => {
    for (const [w, h] of [[720, 3000], [780, 6000], [1080, 4000], [1290, 5000], [900, 9000], [1170, 7000]]) {
      const p = planTiles(w, h);
      expect(p.tiles.length).toBeLessThanOrEqual(2);
      if (!p.tooTall) expect(p.scale * 30).toBeGreaterThanOrEqual(16);
    }
  });

  it("handles degenerate sizes", () => {
    expect(planTiles(0, 100).tooTall).toBe(true);
  });
});

describe("rowVariance", () => {
  it("is ~0 on blank bands and high on text-like rows", () => {
    const w = 40;
    const h = 30;
    const data = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let y = 10; y < 20; y++) {
      for (let x = 0; x < w; x++) {
        const v = x % 8 < 4 ? 0 : 255; // stripes
        const i = (y * w + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = v;
      }
    }
    const rv = rowVariance(data, w, h);
    expect(rv).toHaveLength(h);
    expect(rv[2]).toBeLessThan(1);
    expect(rv[25]).toBeLessThan(1);
    expect(rv[15]).toBeGreaterThan(1000);
  });
});

describe("findSeam", () => {
  it("lands in the middle of a synthetic gap within the window", () => {
    const rv = new Array(1000).fill(900);
    for (let y = 540; y < 580; y++) rv[y] = 0; // gap, middle 560
    expect(findSeam(rv, 500)).toBe(560);
  });

  it("picks the longest gap", () => {
    const rv = new Array(1000).fill(900);
    for (let y = 420; y < 430; y++) rv[y] = 0;
    for (let y = 560; y < 600; y++) rv[y] = 0;
    expect(findSeam(rv, 500)).toBe(580);
  });

  it("keeps the target when there is no gap or gap is outside the window", () => {
    const rv = new Array(1000).fill(900);
    expect(findSeam(rv, 500)).toBe(500);
    for (let y = 100; y < 140; y++) rv[y] = 0;
    expect(findSeam(rv, 500)).toBe(500);
  });
});

describe("mergeTiles", () => {
  it("joins a cut line at the seam, keeping the longer version", () => {
    const a = ["Hi Jordan, thanks for applying", "We would like to schedule a short call this week", "Please reply with your avail"].join("\n");
    const b = ["We would like to schedule a short call this week", "Please reply with your availability", "Thanks"].join("\n");
    expect(mergeTiles([a, b]).split("\n")).toEqual([
      "Hi Jordan, thanks for applying",
      "We would like to schedule a short call this week",
      "Please reply with your availability",
      "Thanks",
    ]);
  });

  it("removes an exact duplicated overlap", () => {
    const a = "line one is here\nline two is here\nline three is here";
    const b = "line two is here\nline three is here\nline four is here";
    expect(mergeTiles([a, b]).split("\n")).toEqual([
      "line one is here",
      "line two is here",
      "line three is here",
      "line four is here",
    ]);
  });

  it("keeps a short repeated line from a different sender when there is no overlap", () => {
    const a = "Recruiter: Can you start Monday?\nMe: ok";
    const b = "Recruiter: Great, I will send forms\nMe: ok";
    expect(mergeTiles([a, b]).split("\n")).toEqual([
      "Recruiter: Can you start Monday?",
      "Me: ok",
      "Recruiter: Great, I will send forms",
      "Me: ok",
    ]);
  });

  it("appends everything when there is no overlap", () => {
    expect(mergeTiles(["alpha beta gamma", "delta epsilon zeta"])).toBe("alpha beta gamma\ndelta epsilon zeta");
    expect(mergeTiles([])).toBe("");
    expect(mergeTiles(["only one"])).toBe("only one");
  });
});

describe("tall made-up chat", () => {
  const lines: string[] = [];
  for (let i = 0; i < 34; i++) {
    const who = i % 2 === 0 ? "Recruiter" : "Me";
    lines.push(`${who}: message number ${i + 1} about the made-up Acme Widgets internship step ${i * 7 + 3}`);
  }
  lines[5] = "Me: ok";
  lines[24] = "Me: ok";
  lines[25] = "Recruiter: sending the onboarding checklist for Acme Widgets now";

  it("merges two overlapping strips with a cut line, every line exactly once", () => {
    const cut = lines[19].slice(0, Math.floor(lines[19].length * 0.6));
    const stripA = [...lines.slice(0, 19), cut].join("\n");
    const stripB = lines.slice(17).join("\n"); // overlap: lines 17, 18, 19
    const merged = mergeTiles([stripA, stripB]).split("\n");
    expect(merged).toEqual(lines);
    expect(merged.filter((l) => l === "Me: ok")).toHaveLength(2);
  });

  it("survives a model that repeats a short line at the seam boundary only once", () => {
    const stripA = lines.slice(0, 26).join("\n");
    const stripB = lines.slice(24).join("\n"); // overlap includes the repeated "Me: ok" at 24
    expect(mergeTiles([stripA, stripB]).split("\n")).toEqual(lines);
  });
});

describe("fitPayload", () => {
  const sizer = (base: number[]) => (i: number, q: number) => Math.round(base[i] * (q / 0.85));

  it("keeps 0.85 when it fits", () => {
    expect(fitPayload(2, sizer([1_000_000, 1_000_000]))).toEqual([0.85, 0.85]);
  });

  it("lowers quality of the largest strip first", () => {
    const q = fitPayload(2, sizer([2_000_000, 1_700_000]));
    expect(q).toEqual([0.7, 0.85]);
  });

  it("returns null when even the lowest quality does not fit", () => {
    expect(fitPayload(2, sizer([5_000_000, 5_000_000]))).toBeNull();
  });
});
