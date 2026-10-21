// Tier features stay invisible until the commit where each passes its gates (tiers-orchestration.md, Phase A.4).
export const TIER_FLAGS = {
  resume: true, // Slice 8: tailored resume PDF
  tracker: true, // Slice 9: application tracker board
  screenshot: true, // Slice 10: message screenshot upload
  interview: true, // Slice 11: mock interview shell, recruiter screen, behavioral
  coding: true, // Slice 12: live coding round (tech; needs interview)
  design: false, // Slice 13: system design board (tech; needs interview)
} as const;
