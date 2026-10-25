/** Motion values shared by the tool rooms. Durations are seconds for motion/react. */
export const dur = {
  press: 0.09,
  hover: 0.14,
  enter: 0.22,
  exit: 0.14,
  route: 0.24,
  stagger: 0.045,
  count: 0.9,
  ring: 1.1,
  celebrate: 1.2,
} as const;

export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  exit: [0.3, 0, 0.8, 0.15],
} as const;

export const spring = {
  press: { type: "spring", stiffness: 600, damping: 35, mass: 0.6 },
  snap: { type: "spring", stiffness: 500, damping: 32 },
  layout: { type: "spring", stiffness: 380, damping: 34, mass: 0.9 },
  soft: { type: "spring", stiffness: 240, damping: 26 },
  stamp: { type: "spring", stiffness: 320, damping: 15, mass: 0.8 },
} as const;

export const variants = {
  rise: { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } },
  reduced: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
} as const;

/** Capped list delay; a long report should never make the last item wait. */
export function revealDelay(index: number): number {
  return Math.max(0, Math.min(index, 8)) * dur.stagger;
}

export function motionSettings(reduce: boolean) {
  const t = reduce ? Object.fromEntries(Object.keys(dur).map((key) => [key, 0])) as Record<keyof typeof dur, number> : dur;
  const still = { type: "tween" as const, duration: 0 };
  const springs = reduce ? { press: still, snap: still, layout: still, soft: still, stamp: still } : spring;
  return {
    reduce,
    t,
    spring: springs,
    rise(index = 0) {
      return {
        initial: reduce ? variants.reduced.hidden : variants.rise.hidden,
        animate: reduce ? variants.reduced.visible : variants.rise.visible,
        transition: { duration: t.enter, delay: reduce ? 0 : revealDelay(index), ease: ease.out },
      };
    },
  };
}
