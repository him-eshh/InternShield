"use client";
import { useSyncExternalStore } from "react";
import type { MotionPref } from "@/lib/types";

const EVENT = "is:motion-change";

export function currentMotion(): MotionPref {
  const v = typeof document === "undefined" ? "" : document.documentElement.dataset.motion;
  return v === "on" || v === "reduced" ? v : "system";
}

export function applyMotion(v: MotionPref) {
  document.documentElement.dataset.motion = v;
  window.dispatchEvent(new Event(EVENT));
}

/** motion/react MotionConfig value for a preference. */
export const configFor = (v: MotionPref) => (v === "on" ? "never" : v === "reduced" ? "always" : "user");

/** True when animation should be skipped: the app setting wins, "system" follows the OS. */
export function prefersReduce(v: MotionPref = currentMotion()): boolean {
  if (v === "on") return false;
  if (v === "reduced") return true;
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
const subscribeOs = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export const useMotionPref = (): MotionPref => useSyncExternalStore(subscribe, currentMotion, () => "system");
export const useReduce = (): boolean => {
  const pref = useMotionPref();
  return useSyncExternalStore(subscribeOs, () => prefersReduce(pref), () => false);
};
