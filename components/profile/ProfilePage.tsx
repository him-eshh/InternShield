"use client";
// /profile placeholder (shell stream replaces it with the guided setup). Optional: nothing routes here by force.
import { useRouter } from "next/navigation";
import ProfileSteps from "../ProfileSteps";
import { useAppState } from "../shell/AppStateProvider";
import { useBack } from "../shell/useBack";
import { linkClass } from "../ui";

export default function ProfilePage() {
  const router = useRouter();
  const back = useBack();
  const { ready, profile, resume, setProfile, setResume, clearAll } = useAppState();
  if (!ready) return null;
  return (
    <>
      <ProfileSteps
        key={profile ? "edit" : "new"}
        initial={profile}
        initialResume={resume}
        onCancel={back}
        onDone={(p, r) => {
          setProfile(p);
          setResume(r);
          router.push("/");
        }}
      />
      {(profile || resume) && (
        <p className="mx-auto max-w-[640px] px-6 pb-12 text-center">
          <button
            type="button"
            className={linkClass}
            onClick={() => {
              clearAll();
              router.push("/");
            }}
          >
            Clear my data
          </button>
        </p>
      )}
    </>
  );
}
