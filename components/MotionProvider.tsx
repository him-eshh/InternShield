"use client";
import { LazyMotion, MotionConfig } from "motion/react";

// domMax (layout animations, drag) loads after first paint, in its own chunk.
const features = () => import("./motionFeatures").then((m) => m.default);

/** Use `m.*` from "motion/react-m" (not `motion.*`: strict mode throws). Reduced motion follows the OS setting. */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
