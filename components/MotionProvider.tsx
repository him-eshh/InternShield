"use client";
import { LazyMotion, MotionConfig } from "motion/react";
import { configFor, useMotionPref } from "./motion/motionPref";

// domMax (layout animations, drag) loads after first paint, in its own chunk.
const features = () => import("./motionFeatures").then((m) => m.default);

/** Use `m.*` from "motion/react-m" (not `motion.*`: strict mode throws). The Motion setting (html[data-motion]) decides; "system" follows the OS. */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion={configFor(useMotionPref())}>{children}</MotionConfig>
    </LazyMotion>
  );
}
