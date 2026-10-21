import type { Example } from "@/lib/examples";
import type { Facts, ScoreInput, SenderData, StepResults } from "@/lib/types";

export const SKIP = { status: "skipped", reason: "missing input" } as const;

export function facts(over: Partial<Facts> = {}): Facts {
  return {
    isJobMessage: true,
    company: null,
    role: null,
    pay: null,
    sender: { name: null, email: null, phone: null },
    asks: [],
    offPlatform: null,
    pressure: [],
    interview: { status: "unclear", quote: null },
    dutiesVague: null,
    noExperienceNeeded: null,
    employerCountryHint: null,
    otherConcerns: [],
    ...over,
  };
}

export function sender(email: string, over: Partial<SenderData> = {}): StepResults["sender"] {
  const domain = email.split("@")[1];
  return {
    status: "done",
    data: { email, domain, freeEmail: false, registeredAt: "2010-01-01T00:00:00Z", hasMx: true, hunter: null, ...over },
  };
}

export const company = (officialDomain: string | null): StepResults["company"] => ({
  status: "done",
  data: officialDomain ? { officialDomain, careersUrl: null } : null,
});

export function input(over: Partial<Omit<ScoreInput, "steps">> & { text: string; steps?: Partial<StepResults> }): ScoreInput {
  const f = over.facts === undefined ? facts() : over.facts;
  return {
    facts: f,
    profile: null,
    resumeText: null,
    source: null,
    stage: null,
    answers: {},
    form: { sender: null, company: null },
    ...over,
    steps: {
      extract: f ? { status: "done", data: f } : { status: "failed", reason: "error" },
      company: SKIP,
      sender: SKIP,
      posting: SKIP,
      ...over.steps,
    },
  };
}

export function fromExample(ex: Example): ScoreInput {
  return {
    text: ex.text,
    facts: ex.savedSteps.extract.status === "done" ? ex.savedSteps.extract.data : null,
    steps: ex.savedSteps,
    profile: null,
    resumeText: null,
    source: ex.source,
    stage: ex.stage,
    answers: {},
    form: ex.form,
  };
}

export const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
