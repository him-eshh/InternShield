"use client";
import { useRouter } from "next/navigation";

/** Browser back when there is in-app history (keeps back/forward honest), else the fallback route (deep links). */
export function useBack(fallback = "/") {
  const router = useRouter();
  return () => (window.history.length > 1 ? router.back() : router.push(fallback));
}
