"use client";
// Server and first client paint agree: cards are visible. Start the mount reveal only after hydration.
// Reduced motion never sets a hidden state, including the first frame.
import { useAnimationControls } from "motion/react";
import { useEffect } from "react";
import { useMotion } from "../motion/useMotion";

export function useReveal() {
  const { reduce, t } = useMotion();
  const controls = useAnimationControls();
  useEffect(() => {
    if (reduce !== false) return;
    controls.set({ opacity: 0, y: 10 });
    void controls.start((i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: t.enter, delay: Math.min(i, 8) * t.stagger, ease: [0.22, 1, 0.36, 1] },
    }));
    return () => controls.stop();
  }, [controls, reduce, t.enter, t.stagger]);
  return (i: number) => ({ initial: false as const, animate: controls, custom: i });
}
