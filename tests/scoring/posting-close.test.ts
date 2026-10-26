import { describe, expect, it } from "vitest";
import { rolesClose, rolesMatch } from "@/lib/scoring/posting";

describe("rolesClose (good sign needs a real role match)", () => {
  it("one shared word is not the same role", () => {
    expect(rolesMatch("weekly paid study assistants", "Federal Work Study")).toBe(true);
    expect(rolesClose("weekly paid study assistants", "Federal Work Study")).toBe(false);
  });
  it("same role with extra words still counts", () => {
    expect(rolesClose("Software Engineering Intern", "Software Engineer Intern, Summer 2027")).toBe(true);
    expect(rolesClose("Data Intern", "Data Analyst Intern")).toBe(true);
    expect(rolesClose(null, "Data Analyst")).toBe(true);
  });
});
