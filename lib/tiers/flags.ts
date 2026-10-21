// Tier features stay invisible until the commit where each passes its gates (tiers-orchestration.md, Phase A.4).
export const TIER_FLAGS = {
  resume: true, // Slice 8: tailored resume PDF
  tracker: true, // Slice 9: application tracker board
  screenshot: false, // Slice 10: message screenshot upload
} as const;
