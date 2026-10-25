import { describe, expect, it } from "vitest";
import { checkLinks, findUrls } from "@/lib/scoring/links";
import { score } from "@/lib/scoring/score";
import { facts, input } from "./helpers";

const ctx: { company: string | null; officialDomain: string | null } = { company: "Northwind Labs", officialDomain: "northwind.example" };
const issuesOf = (text: string, c = ctx) => checkLinks(text, c).map((l) => l.issues);

describe("link checks (local, no fetch)", () => {
  it("finds URLs and trims trailing punctuation", () => {
    expect(findUrls("Apply at https://bit.ly/abc123. Or www.northwind.example/jobs, thanks")).toEqual([
      "https://bit.ly/abc123",
      "www.northwind.example/jobs",
    ]);
  });

  it("flags shorteners, punycode, raw IPs and Google Forms", () => {
    expect(issuesOf("go to https://bit.ly/x1")).toEqual([["shortener"]]);
    expect(issuesOf("http://xn--nrthwind-9ya.example/apply")[0]).toContain("punycode");
    expect(issuesOf("http://203.0.113.7/onboard")).toEqual([["raw-ip"]]);
    expect(issuesOf("fill https://docs.google.com/forms/d/e/abc/viewform")).toEqual([["google-form"]]);
    expect(issuesOf("fill https://forms.gle/AbC")).toEqual([["google-form"]]);
  });

  it("flags brand + careers words on a non-official host, and lookalikes", () => {
    expect(issuesOf("https://northwind-careers.example/apply")).toEqual([["lookalike", "brand-careers-offsite"]]);
    expect(issuesOf("https://northwind-hr.example/apply", { ...ctx, officialDomain: null })).toEqual([["brand-careers-offsite"]]);
    expect(issuesOf("https://northwlnd.example/jobs")).toEqual([["lookalike"]]);
  });

  it("near misses: official host, its subdomains, hiring platforms, plain docs links", () => {
    expect(issuesOf("https://careers.northwind.example/roles/42")).toEqual([[]]);
    expect(issuesOf("https://careers.northwind.example/roles/42", { ...ctx, officialDomain: null })).toEqual([[]]);
    expect(issuesOf("https://boards.greenhouse.io/northwind/jobs/1")).toEqual([[]]);
    expect(issuesOf("https://docs.google.com/presentation/d/abc")).toEqual([[]]);
    expect(issuesOf("no links here")).toEqual([]);
  });
});

describe("links in the score", () => {
  it("adds one flag per link kind and fills report.links", () => {
    const r = score(input({ text: "Short form here: https://forms.gle/AbC and https://bit.ly/x1 and https://bit.ly/x2" }));
    expect(r.flags.filter((f) => f.id === "link_shortener")).toHaveLength(1);
    expect(r.flags.map((f) => f.id)).toContain("link_google_form");
    expect(r.links).toHaveLength(3);
    expect(r.flags.find((f) => f.id === "link_shortener")?.quote).toBe("https://bit.ly/x1");
  });

  it("makes a Google Form critical when it asks for SSN or bank data", () => {
    const r = score(input({ text: "Send your SSN and bank account number in this form https://forms.gle/AbC" }));
    expect(r.flags.find((f) => f.id === "link_google_form")?.critical).toBe(true);
    expect(r.level).toBe("high");
  });

  it("flags a careers look-alike off the official site, not the company's own subdomain", () => {
    const company = { status: "done", data: { officialDomain: "northwind.example" } } as never;
    const f = facts({ company: { value: "Northwind Labs", quote: "Northwind Labs" } });
    const ids = (text: string) => score(input({ text, facts: f, steps: { company } })).flags.map((x) => x.id);
    expect(ids("Northwind Labs is hiring, apply at https://northwind-careers.example/apply")).toContain("link_lookalike");
    expect(ids("Northwind Labs is hiring, apply at https://careers.northwind.example/apply")).not.toContain("link_lookalike");
  });
});
