"use client";

import { useReduce } from "./motionPref";
import { motionSettings } from "./tokens";

/** Named motion settings with an instant equivalent for reduced-motion users. */
export function useMotion() {
  return motionSettings(useReduce());
}
