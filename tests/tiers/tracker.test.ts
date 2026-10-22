import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KEYS } from "@/lib/client/storage";
import { addCard, loadCards, moveCard, removeCard, saveCards, updateNotes } from "@/lib/tiers/tracker";
import type { TrackerCard } from "@/lib/tiers/types";

// Made-up companies and roles.
const base = { company: "Brightleaf Labs", role: "Data Analyst Intern", link: null, risk: null } as const;

function card(over: Partial<TrackerCard> = {}): TrackerCard {
  return { id: "c1", company: "Acme Robotics", role: "Design Intern", link: null, risk: "low", column: "saved", notes: "", createdAt: 1, ...over };
}

describe("addCard", () => {
  it("puts the new card first with trimmed fields and defaults", () => {
    const start = [card()];
    const next = addCard(start, { ...base, company: "  Brightleaf Labs ", role: " Data Analyst Intern  " }, 500, "new");
    expect(next[0]).toEqual({
      id: "new",
      company: "Brightleaf Labs",
      role: "Data Analyst Intern",
      link: null,
      risk: null,
      column: "saved",
      notes: "",
      createdAt: 500,
    });
    expect(next[1]).toBe(start[0]);
    expect(start).toHaveLength(1);
  });

  it("keeps column, notes and risk when given", () => {
    const [c] = addCard([], { ...base, risk: "medium", column: "applied", notes: "  Applied on their site " }, 1, "x");
    expect(c).toMatchObject({ column: "applied", notes: "Applied on their site", risk: "medium" });
  });

  it("ignores a duplicate company + role + link, case-insensitive", () => {
    const one = addCard([], { ...base, link: "https://brightleaf.example/jobs/1" }, 1, "a");
    const two = addCard(one, { ...base, company: "BRIGHTLEAF LABS", role: "data analyst intern", link: "HTTPS://brightleaf.example/jobs/1" }, 2, "b");
    expect(two).toBe(one);
    const three = addCard(one, { ...base, link: "https://brightleaf.example/jobs/2" }, 3, "c");
    expect(three).toHaveLength(2);
  });

  it("keeps only http(s) links", () => {
    expect(addCard([], { ...base, link: "javascript:alert(1)" }, 1, "a")[0].link).toBeNull();
    expect(addCard([], { ...base, link: "ftp://brightleaf.example" }, 1, "a")[0].link).toBeNull();
    expect(addCard([], { ...base, link: "not a url" }, 1, "a")[0].link).toBeNull();
    expect(addCard([], { ...base, link: " https://brightleaf.example/apply " }, 1, "a")[0].link).toBe("https://brightleaf.example/apply");
  });

  it("needs a company; the role is optional", () => {
    const start = [card()];
    expect(addCard(start, { ...base, company: "   " }, 1, "a")).toBe(start);
    const added = addCard(start, { ...base, role: "" }, 1, "a");
    expect(added).toHaveLength(2);
    expect(added[0].role).toBe("");
  });

  it("makes an id when none is given", () => {
    const [a] = addCard([], base);
    const [b] = addCard([], base);
    expect(a.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });

  it("caps notes at 500 and the board at 200 cards", () => {
    expect(addCard([], { ...base, notes: "n".repeat(900) }, 1, "a")[0].notes).toHaveLength(500);
    const full = Array.from({ length: 200 }, (_, i) => card({ id: `c${i}`, role: `Role ${i}` }));
    const next = addCard(full, base, 1, "new");
    expect(next).toHaveLength(200);
    expect(next[0].id).toBe("new");
  });
});

describe("moveCard", () => {
  const cards = [card({ id: "a", column: "saved" }), card({ id: "b", column: "interviewing" })];

  it("moves one column at a time", () => {
    expect(moveCard(cards, "a", 1)[0].column).toBe("applied");
    expect(moveCard(moveCard(cards, "a", 1), "a", 1)[0].column).toBe("interviewing");
    expect(moveCard(cards, "b", -1)[1].column).toBe("applied");
  });

  it("clamps at both ends and leaves the input alone", () => {
    expect(moveCard(cards, "a", -1)[0].column).toBe("saved");
    expect(moveCard(cards, "b", 1)[1].column).toBe("interviewing");
    moveCard(cards, "a", 1);
    expect(cards[0].column).toBe("saved");
  });

  it("unknown id changes nothing", () => {
    expect(moveCard(cards, "zzz", 1)).toEqual(cards);
  });
});

describe("updateNotes and removeCard", () => {
  const cards = [card({ id: "a" }), card({ id: "b" })];

  it("updates notes, capped at 500", () => {
    const next = updateNotes(cards, "b", "x".repeat(700));
    expect(next[1].notes).toHaveLength(500);
    expect(next[0]).toBe(cards[0]);
    expect(cards[1].notes).toBe("");
    expect(updateNotes(cards, "a", "Call back Friday")[0].notes).toBe("Call back Friday");
  });

  it("removes by id", () => {
    expect(removeCard(cards, "a").map((c) => c.id)).toEqual(["b"]);
    expect(removeCard(cards, "zzz")).toEqual(cards);
    expect(cards).toHaveLength(2);
  });
});

describe("loadCards / saveCards", () => {
  let store: Map<string, string>;
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  beforeEach(() => {
    store = new Map();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
    });
  });
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("round-trips through is:tracker", () => {
    const cards = [card({ id: "a" }), card({ id: "b", column: "applied", link: "https://acme.example/jobs" })];
    saveCards(cards);
    expect(JSON.parse(store.get(KEYS.tracker)!)).toEqual(cards);
    expect(loadCards()).toEqual(cards);
  });

  it("returns [] when nothing or junk is stored", () => {
    expect(loadCards()).toEqual([]);
    store.set(KEYS.tracker, "{not json");
    expect(loadCards()).toEqual([]);
    store.set(KEYS.tracker, JSON.stringify({ cards: [] }));
    expect(loadCards()).toEqual([]);
  });

  it("drops bad entries and keeps good ones", () => {
    const good = card({ id: "ok" });
    store.set(
      KEYS.tracker,
      JSON.stringify([
        good,
        null,
        "card",
        { ...good, id: "" },
        { ...good, id: "nocompany", company: 5 },
        { ...good, id: "badcol", column: "rejected" },
        { ...good, id: "badrisk", risk: "safe" },
        { ...good, id: "badtime", createdAt: "yesterday" },
        { ...good, id: "badnotes", notes: null },
        { ...good, id: "badlink", link: "javascript:alert(1)" },
      ]),
    );
    expect(loadCards().map((c) => c.id)).toEqual(["ok"]);
  });

  it("caps at 200 cards", () => {
    store.set(KEYS.tracker, JSON.stringify(Array.from({ length: 250 }, (_, i) => card({ id: `c${i}` }))));
    expect(loadCards()).toHaveLength(200);
  });
});
