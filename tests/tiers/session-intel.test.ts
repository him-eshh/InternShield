import { describe, expect, it } from "vitest";
import { intelRounds, intelValues } from "@/lib/tiers/sessionIntel";
import type { CompanyIntel } from "@/lib/server/companyIntel";
const intel: CompanyIntel = { company: "Acme", cached: false, sources: [{ label: "Careers", url: "https://example.com/careers" }], interview: { rounds: ["Recruiter phone screen", "Coding interview", "Leadership and values"], notes: [] }, values: ["Ownership"] };
describe("company session research", () => {
  it("maps cited stages and behavioral themes into practice", () => {
    expect(intelRounds(intel)).toEqual(["screen", "coding", "behavioral"]);
    expect(intelValues(intel)).toEqual(["Ownership"]);
  });
  it("falls back to presets when research is limited or lacks sources", () => {
    expect(intelRounds({ ...intel, limited: true }, "amazon")).toEqual(["behavioral", "coding"]);
    expect(intelRounds({ ...intel, sources: [] }, "google")).toEqual(["coding", "behavioral"]);
    expect(intelValues({ ...intel, sources: [] })).toEqual([]);
    expect(intelRounds(null)).toEqual([]);
  });
});
