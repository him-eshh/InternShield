import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerState } from "@/lib/server/cache";
import { req } from "./helpers";

const h = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@tavily/core", () => ({ tavily: () => ({ search: h.search }) }));

import { POST as company } from "@/app/api/company/route";
import { POST as posting } from "@/app/api/posting/route";

let ip = 0;
const call = (name: string) => company(req("company", { company: name }, { ip: `10.0.0.${++ip}` }));

beforeEach(() => {
  resetServerState();
  h.search.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("TAVILY_API_KEY", "test-key");
  vi.stubEnv("ALLOWED_ORIGINS", "");
});

describe("company route", () => {
  it("picks the official domain by name and skips job boards", async () => {
    h.search.mockResolvedValue({
      results: [
        { title: "Stripe jobs | LinkedIn", url: "https://www.linkedin.com/company/stripe/jobs", content: "" },
        { title: "Jobs at Stripe", url: "https://stripe.com/jobs", content: "" },
      ],
    });
    const res = await call("Stripe");
    expect(await res.json()).toEqual({
      status: "done",
      data: { officialDomain: "stripe.com", careersUrl: "https://stripe.com/jobs" },
    });
    const [query, opts] = h.search.mock.calls[0];
    expect(query).toBe("Stripe careers");
    expect(opts).toMatchObject({ searchDepth: "basic", maxResults: 5, includeRawContent: false });
  });

  it("returns done with null when no result matches the name", async () => {
    h.search.mockResolvedValue({ results: [{ title: "x", url: "https://www.indeed.com/q-brightline-jobs.html", content: "" }] });
    expect(await (await call("Brightline Data Solutions")).json()).toEqual({ status: "done", data: null });
  });

  it("caches by company name", async () => {
    h.search.mockResolvedValue({ results: [] });
    await call("Acme");
    await call("acme");
    expect(h.search).toHaveBeenCalledTimes(1);
  });

  it("returns failed limit when the Tavily daily cap is reached", async () => {
    vi.stubEnv("TAVILY_DAILY_CAP", "1");
    h.search.mockResolvedValue({ results: [] });
    expect((await call("One")).status).toBe(200);
    const res = await call("Two");
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ status: "failed", reason: "limit" });
    expect(h.search).toHaveBeenCalledTimes(1);
  });

  it("returns failed timeout when Tavily times out", async () => {
    h.search.mockRejectedValue(Object.assign(new Error("timeout of 8000ms exceeded"), { name: "TimeoutError" }));
    const res = await call("Slow Co");
    expect(res.status).toBe(504);
    expect(await res.json()).toMatchObject({ status: "failed", reason: "timeout" });
  });

  it("returns failed error on other Tavily failures", async () => {
    h.search.mockRejectedValue(new Error("boom"));
    const res = await call("Broken Co");
    expect(res.status).toBe(502);
  });
});

describe("posting route", () => {
  it("prefers a result on the official domain and reads title, location, pay", async () => {
    h.search.mockResolvedValue({
      results: [
        { title: "Intern at Acme - Other Site", url: "https://random.example/acme", content: "" },
        {
          title: "Software Engineering Intern",
          url: "https://acme.com/careers/swe-intern",
          content: "Location: Austin, TX. Pay $40 - $45 per hour.",
          publishedDate: "2026-09-01",
        },
      ],
    });
    const res = await posting(
      req("posting", { company: "Acme", role: "Software Engineering Intern", officialDomain: "acme.com" }),
    );
    const { data } = await res.json();
    expect(data).toMatchObject({
      found: true,
      url: "https://acme.com/careers/swe-intern",
      title: "Software Engineering Intern",
      location: "Austin, TX",
      onOfficialDomain: true,
    });
    expect(data.pay).toMatch(/\$40/);
    const opts = h.search.mock.calls[0][1];
    expect(opts.includeDomains[0]).toBe("acme.com");
    expect(opts.includeDomains).toContain("jobs.lever.co");
  });

  it("returns found false when nothing is on the official site or a hiring platform", async () => {
    h.search.mockResolvedValue({ results: [{ title: "x", url: "https://blog.example/post", content: "" }] });
    const res = await posting(req("posting", { company: "Acme", role: null, officialDomain: "acme.com" }, { ip: "11.0.0.1" }));
    expect((await res.json()).data.found).toBe(false);
  });
});
