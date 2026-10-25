// v3 replaces the legacy per-line options UI with a guarded file editor.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResumeTailor from "@/components/tiers/ResumeTailor";
const props = { onOpenProfile: () => {}, onBack: () => {}, target: { company: "Northwind", role: "Web Intern", description: "Required: JavaScript" } };
describe("Tailor v3 inputs", () => {
  it("offers original-file upload without requiring profile setup", () => {
    const html = renderToStaticMarkup(<ResumeTailor {...props} resume={null} />);
    expect(html).toContain("Upload resume");
    expect(html).toContain("Choose PDF or Word");
    expect(html).toContain("Tailor my resume");
    expect(html).toContain("Your resume");
    expect(html).toContain("Your resume text and posting are sent to AI");
    expect(html).toContain("review every line against your experience");
    expect(html).not.toContain("Edited in your browser.");
    expect(html).not.toContain("How to tailor");
  });
  it("prefills profile text and report target and explains original-file formatting", () => {
    const html = renderToStaticMarkup(<ResumeTailor {...props} resume={{ text: "- Built a website using JavaScript.", fileName: "resume.pdf" }} />);
    expect(html).toContain("Built a website using JavaScript.");
    expect(html).toContain("Northwind");
    expect(html).toContain("Web Intern");
    expect(html).toContain("Profile text loaded");
  });
});
