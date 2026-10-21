"use client";
// STUB (Slice 1): proves the stub flow end to end. ui-builder replaces this with <App />.
import { useState } from "react";
import { EXAMPLES } from "@/lib/examples";
import { score } from "@/lib/scoring/score";
import type { ApiResponse, CompanyData, Facts, PostingData, Report, SenderData, StepResults } from "@/lib/types";

async function post<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

export default function Page() {
  const [report, setReport] = useState<Report | null>(null);

  async function run(id: "scam" | "real") {
    const ex = EXAMPLES[id];
    const extract = await post<Facts>("/api/extract", { message: ex.text, sender: ex.form.sender, company: ex.form.company });
    const [company, sender] = await Promise.all([
      post<CompanyData | null>("/api/company", { company: ex.form.company }),
      post<SenderData>("/api/sender", { email: ex.form.sender }),
    ]);
    const posting: StepResults["posting"] =
      company.status === "done" && company.data
        ? await post<PostingData>("/api/posting", { company: ex.form.company, role: null, officialDomain: company.data.officialDomain })
        : { status: "skipped", reason: "needs step 2" };
    const steps: StepResults = { extract, company, sender, posting };
    setReport(
      score({
        text: ex.text,
        facts: extract.status === "done" ? extract.data : null,
        steps,
        profile: null,
        resumeText: null,
        source: ex.source,
        stage: ex.stage,
        answers: {},
        form: ex.form,
      }),
    );
  }

  return (
    <main className="mx-auto max-w-[640px] px-6 py-16">
      <h1 className="text-[clamp(36px,6vw,72px)] font-bold tracking-[-0.025em]">Is this offer real?</h1>
      <div className="mt-8 flex gap-3">
        <button className="rounded-full bg-accent px-5 py-2 text-accent-contrast" onClick={() => run("scam")}>Try an example: a scam</button>
        <button className="rounded-full border border-border px-5 py-2" onClick={() => run("real")}>a real one</button>
      </div>
      {report && <pre data-testid="report" className="mt-8 overflow-auto rounded-[18px] bg-bg-soft p-4 text-sm">{JSON.stringify(report, null, 2)}</pre>}
    </main>
  );
}
