"use client";
// /tailor entry: feeds ResumeTailor from the shared app state (resume stream owns this file after setup).
import { useRouter } from "next/navigation";
import { useResume, useTargets } from "../shell/AppStateProvider";
import { useBack } from "../shell/useBack";
import ResumeTailor from "./ResumeTailor";

export default function ResumeTailorPage() {
  const router = useRouter();
  const back = useBack();
  const { ready, resume } = useResume();
  const { targets } = useTargets();
  if (!ready) return null;
  return <ResumeTailor resume={resume} target={targets.tailor} onOpenProfile={() => router.push("/profile")} onBack={back} />;
}
