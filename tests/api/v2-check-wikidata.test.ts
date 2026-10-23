// Wikidata official-website lookup (findings 02 §3.3). fetch is stubbed; no network.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { wikidataCompany } from "@/lib/server/wikidata";

const h = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@tavily/core", () => ({ tavily: () => ({ search: h.search }) }));

const search = { search: [{ id: "Q1" }, { id: "Q2" }] };
const entities = {
  entities: {
    Q1: { labels: { en: { value: "Stripe" } }, descriptions: { en: { value: "pattern of lines" } }, claims: {} },
    Q2: {
      labels: { en: { value: "Stripe, Inc." } },
      descriptions: { en: { value: "American financial services company" } },
      claims: { P856: [{ rank: "normal", mainsnak: { datavalue: { value: "https://stripe.com/" } } }] },
    },
  },
};

function stubFetch(...bodies: unknown[]) {
  const f = vi.fn();
  for (const b of bodies) f.mockResolvedValueOnce(new Response(JSON.stringify(b), { status: 200 }));
  vi.stubGlobal("fetch", f);
  return f;
}

beforeEach(() => resetServerState());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("wikidataCompany", () => {
  it("returns the official domain of the exact-name company item", async () => {
    const f = stubFetch(search, entities);
    expect(await wikidataCompany("Stripe")).toEqual({ officialDomain: "stripe.com", careersUrl: null });
    expect(f.mock.calls[0][1].headers["user-agent"]).toMatch(/InternShield/);
  });

  it("caches the answer", async () => {
    const f = stubFetch(search, entities);
    await wikidataCompany("Stripe");
    await wikidataCompany("stripe");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("ignores non-company items and fuzzy names", async () => {
    stubFetch(search, entities);
    expect(await wikidataCompany("Stripes Media")).toBeNull();
  });

  it("never throws on network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    expect(await wikidataCompany("Stripe")).toBeNull();
  });

  it("is tried before Tavily; Tavily isn't called when it answers", async () => {
    stubFetch(search, entities);
    vi.stubEnv("TAVILY_API_KEY", "k");
    const { findCompany } = await import("@/lib/server/tavily");
    expect(await findCompany("Stripe")).toEqual({ ok: true, data: { officialDomain: "stripe.com", careersUrl: null } });
    expect(h.search).not.toHaveBeenCalled();
  });
});
