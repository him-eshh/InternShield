"use client";

import { useReducedMotion } from "motion/react";
import { motionSettings } from "./tokens";

/** Named motion settings with an instant equivalent for reduced-motion users. */
export function useMotion() {
  return motionSettings(Boolean(useReducedMotion()));
}
