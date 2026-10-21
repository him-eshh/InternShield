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
} as const;
