import { describe, expect, it } from "vitest";
import { EXAMPLES } from "@/lib/examples";
import { rerunWithCompany, runPipeline, type PipelineInput } from "@/lib/client/pipeline";
import type { Facts } from "@/lib/types";

const facts = (EXAMPLES.scam.savedSteps.extract as { data: Facts }).data;
const input: PipelineInput = { text: EXAMPLES.scam.text, form: { sender: null, company: null }, source: "handshake", stage: "offer", profile: null, resumeText: null };
const done = (data: unknown) => new Response(JSON.stringify({ status: "done", data }), { status: 200 });

describe("rerunWithCompany (editable company chip)", () => {
  it("re-runs only company + posting with the edited name; extract and sender are reused", async () => {
    const calls: { path: string; body: unknown }[] = [];
    const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const path = String(url).split("?")[0];
      calls.push({ path, body: JSON.parse(String(init?.body ?? "{}")) });
      if (path === "/api/extract") return done(facts);
      if (path === "/api/company") return done({ officialDomain: "northwind.example", careersUrl: null });
      if (path === "/api/sender") return done({ email: "x@gmail.com", domain: "gmail.com", freeEmail: true, registeredAt: null, hasMx: true, hunter: null });
      if (path === "/api/posting") return done({ found: false, url: null, title: null, location: null, pay: null, postedDate: null, onOfficialDomain: false });
      return done({ text: "ok", source: "ai" });
    }) as typeof globalThis.fetch;
    const deps = { log: false, failParam: null, fetch } as const;
    const first = await runPipeline(input, deps);
    calls.length = 0;
    const again = await rerunWithCompany(input, first.steps, "Northwind Labs", deps);
    const paths = calls.map((c) => c.path);
    expect(paths).not.toContain("/api/extract");
    expect(paths).not.toContain("/api/sender");
    expect(calls.find((c) => c.path === "/api/company")?.body).toEqual({ company: "Northwind Labs" });
    expect(paths).toContain("/api/posting");
    expect(again.report).not.toBeNull();
  });
});
