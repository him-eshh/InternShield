// Tier features stay invisible until the commit where each passes its gates (tiers-orchestration.md, Phase A.4).
export const TIER_FLAGS = {
  resume: true, // Slice 8: tailored resume PDF
  tracker: true, // Slice 9: application tracker board
  screenshot: true, // Slice 10: message screenshot upload
  interview: true, // Slice 11: mock interview shell, recruiter screen, behavioral
  coding: true, // Slice 12: live coding round (tech; needs interview)
  design: true, // Slice 13: system design board (tech; needs interview)
  case: true, // Slice 14: business case interview
  finance: true, // Slice 15: finance technical questions
  portfolio: true, // Slice 16: design portfolio walkthrough
  challenge: true, // Slice 16: timed design challenge on the board
  // v2 (tools stream flips each in the commit where it passes gates)
  tsRunner: true, // TypeScript in the JS worker
  sqlRound: true, // SQL problems on sql.js
  debugRound: true, // "debugging" interview round
  presets: false, // company-style round presets
  scorecard: true, // per-axis interview scorecard
  keywordGap: false, // posting keywords vs resume
  rewriteOptions: false, // up to 3 rewrite options
} as const;

/** v2 rounds App.tsx doesn't know about: on only with live coding and their own flag. */
export function v2RoundOn(round: string): boolean {
  if (round === "sql") return TIER_FLAGS.coding && TIER_FLAGS.sqlRound;
  if (round === "debugging") return TIER_FLAGS.coding && TIER_FLAGS.debugRound;
  return true;
}
