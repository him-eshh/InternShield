import { describe, expect, it } from "vitest";
import { checkLinks, findUrls } from "@/lib/scoring/links";

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
