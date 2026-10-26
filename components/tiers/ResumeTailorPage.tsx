"use client";
// /tailor entry: feeds ResumeTailor from the shared app state (resume stream owns this file after setup).
import { useRouter } from "next/navigation";
import { prefillTarget } from "@/lib/client/storage";
import { useAppState } from "../shell/AppStateProvider";
import { useBack } from "../shell/useBack";
import ResumeTailor from "./ResumeTailor";

export default function ResumeTailorPage() {
  const router = useRouter();
  const back = useBack();
  const { ready, profile, resume, targets, prefs } = useAppState();
  if (!ready) return null;
  return <ResumeTailor resume={resume} target={prefillTarget(targets.tailor, prefs)} profileLevel={profile?.level} onOpenProfile={() => router.push("/profile")} onBack={back} />;
}
