"use client";
// /tracker entry (shell stream owns this after setup).
import { useRouter } from "next/navigation";
import { useTargets } from "../shell/AppStateProvider";
import { useBack } from "../shell/useBack";
import Tracker from "./Tracker";

export default function TrackerPage() {
  const router = useRouter();
  const back = useBack();
  const { setTarget } = useTargets();
  return (
    <Tracker
      onBack={back}
      onPractice={(c) => {
        setTarget("practice", { company: c.company, role: c.role, description: null });
        router.push("/practice");
      }}
    />
  );
}
