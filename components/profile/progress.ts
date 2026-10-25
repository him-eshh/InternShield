"use client";
// Profile completeness: 4 optional steps, each "done" once it holds something. Nothing here gates any flow.
import { useAppState } from "../shell/AppStateProvider";
import { lineKind } from "@/lib/tiers/resumeLines";

export type StepId = "resume" | "roles" | "companies" | "about";
export const STEPS: { id: StepId; title: string; short: string }[] = [
  { id: "resume", title: "Add your resume", short: "Resume" },
  { id: "roles", title: "Pick target roles", short: "Roles" },
  { id: "companies", title: "Name target companies", short: "Companies" },
  { id: "about", title: "About you", short: "About you" },
];

/** First short non-contact line of the resume, if it looks like a name. */
export function resumeName(text: string): string | null {
  const first = text.split("\n").map((l) => l.trim()).find(Boolean);
  if (!first || first.length > 40 || /[@\d|/]/.test(first) || lineKind(first) === "bullet") return null;
  return first.split(/\s+/).length <= 4 ? first : null;
}

export function initialsOf(name: string | null): string | null {
  const parts = name?.split(/\s+/).filter(Boolean) ?? [];
  if (!parts.length) return null;
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function useProfileProgress() {
  const { ready, profile, resume, prefs } = useAppState();
  const done: Record<StepId, boolean> = {
    resume: !!resume,
    roles: prefs.roles.length > 0,
    companies: prefs.companies.length > 0,
    about: !!profile,
  };
  const count = STEPS.filter((s) => done[s.id]).length;
  return { ready, done, count, total: STEPS.length, name: resume ? resumeName(resume.text) : null };
}
