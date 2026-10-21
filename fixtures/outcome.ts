// Dev/test only: wraps the hand-written reports in a pipeline outcome so the report UI can be shown without the network.
import { EXAMPLES } from "@/lib/examples";
import { fallbackExplanation } from "@/lib/explainFallback";
import { retryableSteps, type PipelineInput, type PipelineOutcome } from "@/lib/client/pipeline";
import type { StepResults } from "@/lib/types";

/** Dev-only: `?fixture=scam|real|medium` renders a hand-written report so the UI can be checked without the network. */
export async function fixtureOutcome(name: string): Promise<{ outcome: PipelineOutcome; input: PipelineInput } | null> {
  const { scamReport, realReport, mediumReport } = await import("@/fixtures/reports");
  const report = name === "real" ? realReport : name === "medium" ? mediumReport : name === "scam" ? scamReport : null;
  if (!report) return null;
  const ex = name === "real" ? EXAMPLES.real : EXAMPLES.scam;
  const steps: StepResults =
    name === "medium"
      ? {
          extract: ex.savedSteps.extract,
          company: { status: "failed", reason: "timeout" },
          sender: { status: "failed", reason: "limit", retryAfter: 20 },
          posting: { status: "skipped", reason: "needs step 2" },
        }
      : ex.savedSteps;
  const input: PipelineInput = { text: ex.text, form: ex.form, source: ex.source, stage: ex.stage, profile: null, resumeText: null, exampleId: null };
  const facts = steps.extract.status === "done" ? steps.extract.data : null;
  const outcome: PipelineOutcome = {
    notJob: false,
    steps,
    facts,
    scoreInput: { text: ex.text, facts, steps, profile: null, resumeText: null, source: ex.source, stage: ex.stage, answers: {}, form: ex.form },
    report,
    explanation: {
      text: fallbackExplanation({ level: report.level, flags: report.flags.slice(0, 6).map((f) => ({ title: f.title, quote: f.quote, why: f.why })) }),
      source: "fallback",
    },
    pendingExplanation: null,
    usedSaved: false,
    retryable: retryableSteps(steps),
    retryAfter: name === "medium" ? 20 : null,
    limited: name === "medium",
  };
  return { outcome, input };
}
