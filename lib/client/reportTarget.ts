// What a finished check hands to the next tool: the company/role/link the report found.
import type { NewCard, PostingContext } from "../tiers/types";
import type { PipelineInput, PipelineOutcome } from "./pipeline";

/** Company/role/link the last report found: feeds "Save to tracker" and the Tailor/Practice next steps. Empty string = not known. */
export function reportTarget(outcome: PipelineOutcome, input: PipelineInput): NewCard {
  const posting = outcome.steps.posting.status === "done" ? outcome.steps.posting.data : null;
  return {
    company: outcome.facts?.company?.value?.trim() || input.form.company?.trim() || "",
    role: outcome.facts?.role?.value?.trim() || posting?.title?.trim() || "",
    link: posting?.found && posting.onOfficialDomain ? posting.url : null,
    risk: outcome.report?.level ?? null,
  };
}

/** The Tailor/Practice hand-off for a report target (a blank company or role stays null, never a placeholder). */
export function toPostingContext(card: Pick<NewCard, "company" | "role">): PostingContext {
  return { company: card.company, role: card.role, description: null };
}
