// Loads eval/messages/*.json into ScoreInputs. Shared by eval/run.ts and tests/scoring.
// JSON conveniences (normalized here so every consumer sees full StepResults):
// - savedSteps.extract.data may list only the facts that matter; the rest default to empty.
// - company/sender/posting steps default to { status: "skipped", reason: "missing input" }.
// - sender registeredAt may be relative, e.g. "-20d" = 20 days ago, so ages don't drift.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Answers, Facts, Profile, RiskLevel, ScoreInput, Source, Stage, StepResults } from "../lib/types";

export interface EvalMessage {
  name: string; // file name without .json
  note?: string;
  text: string;
  expectedLevel: RiskLevel;
  profile: Profile | null;
  savedSteps: StepResults;
  source?: Source | null;
  stage?: Stage | null;
  form?: { sender: string | null; company: string | null };
  answers?: Answers;
  resumeText?: string | null;
}

export const MESSAGES_DIR = join(process.cwd(), "eval", "messages");

export const EMPTY_FACTS: Facts = {
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
};

const SKIPPED = { status: "skipped", reason: "missing input" } as const;

function normalizeSteps(raw: Partial<StepResults> & { extract: StepResults["extract"] }): StepResults {
  const extract: StepResults["extract"] =
    raw.extract.status === "done"
      ? {
          status: "done",
          data: {
            ...EMPTY_FACTS,
            ...raw.extract.data,
            sender: { ...EMPTY_FACTS.sender, ...raw.extract.data.sender },
            interview: { ...EMPTY_FACTS.interview, ...raw.extract.data.interview },
          },
        }
      : raw.extract;
  let sender: StepResults["sender"] = raw.sender ?? SKIPPED;
  if (sender.status === "done") {
    const rel = /^-(\d+)d$/.exec(sender.data.registeredAt ?? "");
    const registeredAt = rel ? new Date(Date.now() - Number(rel[1]) * 86_400_000).toISOString() : sender.data.registeredAt;
    sender = { status: "done", data: { ...sender.data, hunter: sender.data.hunter ?? null, registeredAt } };
  }
  return { extract, company: raw.company ?? SKIPPED, sender, posting: raw.posting ?? SKIPPED };
}

export function loadMessages(dir = MESSAGES_DIR): EvalMessage[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const raw = JSON.parse(readFileSync(join(dir, f), "utf8"));
      return { ...raw, name: f.replace(/\.json$/, ""), savedSteps: normalizeSteps(raw.savedSteps) } as EvalMessage;
    });
}

export function toInput(m: EvalMessage): ScoreInput {
  const facts = m.savedSteps.extract.status === "done" ? m.savedSteps.extract.data : null;
  return {
    text: m.text,
    facts,
    steps: m.savedSteps,
    profile: m.profile ?? null,
    resumeText: m.resumeText ?? null,
    source: m.source ?? null,
    stage: m.stage ?? null,
    answers: m.answers ?? {},
    form: m.form ?? { sender: facts?.sender.email ?? null, company: facts?.company?.value ?? null },
  };
}
