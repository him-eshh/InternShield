import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { groqErr, groqOk, req } from "./helpers";

const h = vi.hoisted(() => ({ search: vi.fn(), create: vi.fn(), wiki: vi.fn() }));
vi.mock("@tavily/core", () => ({ tavily: () => ({ search: h.search }) }));
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: h.create } };
  },
}));
vi.mock("@/lib/server/wikidata", () => ({ wikidataCompany: h.wiki }));

import { POST } from "@/app/api/intel/route";

let ip = 0;
const call = (b: unknown) => POST(req("intel", b, { ip: `15.0.0.${++ip}` }));
const json = async (b: unknown) => (await call(b)).json();

const hits = [
  { title: "How we hire | Acme", url: "https://acme.com/careers/how-we-hire", content: "Recruiter screen, then a technical interview, then onsite." },
  { title: "Pat Doe - Recruiter | LinkedIn", url: "https://www.linkedin.com/in/patdoe", content: "Recruiter at Acme." },
  { title: "Acme values", url: "https://acme.com/about", content: "We value ownership." },
];
const claims = (c: unknown[]) => groqOk(JSON.stringify({ claims: c }));

beforeEach(() => {
  resetServerState();
  h.search.mockReset();
  h.create.mockReset();
  h.wiki.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("TAVILY_API_KEY", "test-key");
  vi.stubEnv("GROQ_API_KEY", "test-key");
  vi.stubEnv("ALLOWED_ORIGINS", "");
  h.wiki.mockResolvedValue({ officialDomain: "acme.com" });
  h.search.mockResolvedValue({ results: hits });
});

describe("intel route", () => {
  it("searches the official domain first, drops people sites and unsourced claims, then caches", async () => {
    h.create.mockReturnValue(
      claims([
        { field: "round", text: "Recruiter screen", source: 1 },
        { field: "round", text: "Technical interview", source: 1 },
        { field: "value", text: "Ownership", source: 2 },
        { field: "interviewNote", text: "Made up", source: 9 },
      ]),
    );
    const res = await json({ company: "Acme", role: "SWE Intern", kind: "interview" });
    expect(res.status).toBe("done");
    expect(res.data).toEqual({
      company: "Acme",
      officialSite: "acme.com",
      interview: { rounds: ["Recruiter screen", "Technical interview"], notes: [] },
      values: ["Ownership"],
      sources: [
        { label: "How we hire | Acme", url: "https://acme.com/careers/how-we-hire" },
        { label: "Acme values", url: "https://acme.com/about" },
      ],
      cached: false,
    });
    expect(h.search.mock.calls[0][1]).toMatchObject({ includeDomains: ["acme.com"], includeDomainsMode: "restrict" });
    const prompt = JSON.stringify(h.create.mock.calls[0][0]);
    expect(prompt).not.toContain("linkedin.com");

    const again = await json({ company: "acme", role: "swe intern", kind: "interview" });
    expect(again.data.cached).toBe(true);
    expect(h.search).toHaveBeenCalledTimes(1);
  });

  it("falls back to a general search that excludes people sites when there is no official site", async () => {
    h.wiki.mockResolvedValue(null);
    h.search.mockResolvedValue({ results: [{ title: "Acme resume tips", url: "https://careers.example/acme", content: "Show shipped projects in your resume." }] });
    h.create.mockReturnValue(claims([{ field: "emphasis", text: "Shipped projects", source: 1 }]));
    const res = await json({ company: "Acme", kind: "resume" });
    expect(res.data.resume).toEqual({ emphasis: ["Shipped projects"], notes: [] });
    expect(res.data.officialSite).toBeUndefined();
    const [query, opts] = h.search.mock.calls[0];
    expect(query).toBe("Acme resume tips");
    expect(opts.excludeDomains).toContain("linkedin.com");
  });

  it("drops claims that cite a real hit but are not stated in its snippet", async () => {
    h.create.mockReturnValue(claims([
      { field: "round", text: "Guaranteed offer after one interview", source: 1 },
      { field: "round", text: "Recruiter screen", source: 1 },
      { field: "value", text: 42, source: 2 },
    ]));
    const res = await json({ company: "Acme", kind: "interview" });
    expect(res.data.interview.rounds).toEqual(["Recruiter screen"]);
    expect(res.data.values).toBeUndefined();
    expect(res.data.sources).toEqual([{ label: "How we hire | Acme", url: "https://acme.com/careers/how-we-hire" }]);
  });

  it("does not turn a negated source phrase into a positive interview stage", async () => {
    h.search.mockResolvedValue({ results: [{ title: "Acme hiring", url: "https://acme.com/hiring", content: "No technical interview for interns. Recruiter screen first." }] });
    h.create.mockReturnValue(claims([
      { field: "round", text: "Technical interview", source: 1 },
      { field: "round", text: "Recruiter screen", source: 1 },
    ]));
    const res = await json({ company: "Acme", kind: "interview" });
    expect(res.data.interview.rounds).toEqual(["Recruiter screen"]);
  });

  it("returns limited without calling anything when unconfigured", async () => {
    vi.stubEnv("TAVILY_API_KEY", "");
    const res = await json({ company: "Acme", kind: "interview" });
    expect(res.data).toEqual({ company: "Acme", sources: [], cached: false, limited: true });
    expect(h.search).not.toHaveBeenCalled();
  });

  it("returns limited once INTEL_DAILY_CAP is used up", async () => {
    vi.stubEnv("INTEL_DAILY_CAP", "1");
    h.create.mockReturnValue(claims([]));
    await json({ company: "Acme", kind: "interview" });
    const res = await json({ company: "Beta", kind: "interview" });
    expect(res.data.limited).toBe(true);
    expect(h.search).toHaveBeenCalledTimes(1); // Acme's official-domain search only
  });

  it("returns limited and does not cache when Groq fails", async () => {
    h.create.mockReturnValue(groqErr(500));
    const res = await json({ company: "Acme", kind: "interview" });
    expect(res.data).toMatchObject({ limited: true, officialSite: "acme.com", sources: [] });
    h.create.mockReturnValue(claims([]));
    expect((await json({ company: "Acme", kind: "interview" })).data.cached).toBe(false);
  });

  it("rejects bad input", async () => {
    expect((await call({ company: "", kind: "interview" })).status).toBe(400);
    expect((await call({ company: "Acme", kind: "other" })).status).toBe(400);
  });
});
