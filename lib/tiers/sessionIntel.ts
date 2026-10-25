import type { CompanyIntel } from "../server/companyIntel";
import { getPreset, PRESETS } from "./presets";
import { SETUP_ROUNDS } from "./session";
import type { RoundKind } from "./types";
/** Map cited stage names to the app's supported practice rounds. */
export function intelRounds(intel: CompanyIntel | null, preset?: string): RoundKind[] {
  const matches: RoundKind[] = [];
  if (!intel?.limited && intel?.sources.length) for (const name of intel.interview?.rounds ?? []) {
    const s = name.toLowerCase();
    const round: RoundKind | null = /sql|database/.test(s) ? "sql" : /debug/.test(s) ? "debugging" : /system|design/.test(s) ? "design" : /behavio|leadership|culture|values/.test(s) ? "behavioral" : /coding|algorithm|technical/.test(s) ? "coding" : /recruit|phone|screen/.test(s) ? "screen" : /case/.test(s) ? "case" : /portfolio|take.home/.test(s) ? "portfolio" : null;
    if (round && !matches.includes(round)) matches.push(round);
  }
  return matches.length ? matches : (getPreset(preset)?.rounds.filter((r) => SETUP_ROUNDS.includes(r)) ?? []);
}
export const presetForCompany = (company: string): string | undefined => PRESETS.find((p) => company.toLowerCase().includes(p.id))?.id;
export const intelValues = (intel: CompanyIntel | null): string[] => intel && !intel.limited && intel.sources.length ? (intel.values ?? []).slice(0, 6) : [];
