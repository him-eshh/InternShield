"use client";
// Staggered mount reveal for cards and list rows. Once, on mount; never scroll-driven.
// Under reduced motion the element renders in its final state at once (no initial hidden frame).
import { useReducedMotion } from "motion/react";

export function useReveal() {
  const reduce = useReducedMotion();
  return (i: number) =>
    reduce !== false
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.36, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] as const },
        };
}
