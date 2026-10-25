"use client";
// Server and first client paint agree: cards are visible. Start the mount reveal only after hydration.
// Reduced motion never sets a hidden state, including the first frame.
import { useAnimationControls, useReducedMotion } from "motion/react";
import { useEffect } from "react";

export function useReveal() {
  const reduce = useReducedMotion();
  const controls = useAnimationControls();
  useEffect(() => {
    if (reduce !== false) return;
    controls.set({ opacity: 0, y: 14 });
    void controls.start((i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.36, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] },
    }));
    return () => controls.stop();
  }, [controls, reduce]);
  return (i: number) => ({ initial: false as const, animate: controls, custom: i });
}
