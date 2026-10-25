"use client";
// State that crosses routes (profile, resume, last check, tool targets), persisted through lib/client/storage.
// Mounted once in app/layout.tsx; pages read it through the typed hooks below.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PipelineInput, PipelineOutcome } from "@/lib/client/pipeline";
import {
  clearMyData,
  KEYS,
  loadPrefs,
  loadProfile,
  loadResume,
  NO_PREFS,
  readKey,
  removeResume,
  savePrefs,
  saveProfile,
  saveResume,
  writeKey,
  type ProfilePrefs,
} from "@/lib/client/storage";
import type { Profile, ResumeData } from "@/lib/types";
import type { PostingContext } from "@/lib/tiers/types";
import type { CheckSubmit } from "../CheckForm";

export type LastCheck = { outcome: PipelineOutcome; input: PipelineInput; submit: CheckSubmit | null };
export type Targets = { tailor: PostingContext | null; practice: PostingContext | null };

type State = {
  /** False until browser storage has been read (SSR and first paint have none). */
  ready: boolean;
  profile: Profile | null;
  resume: ResumeData | null;
  lastCheck: LastCheck | null;
  targets: Targets;
  prefs: ProfilePrefs;
  setPrefs: (p: ProfilePrefs) => void;
  setProfile: (p: Profile | null) => void;
  setResume: (r: ResumeData | null) => void;
  setLastCheck: (c: LastCheck | null) => void;
  setTarget: (tool: keyof Targets, t: PostingContext | null) => void;
  clearAll: () => void;
};

const NO_TARGETS: Targets = { tailor: null, practice: null };
const Ctx = createContext<State | null>(null);

export default function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [resume, setResumeState] = useState<ResumeData | null>(null);
  const [lastCheck, setLastCheckState] = useState<LastCheck | null>(null);
  const [targets, setTargets] = useState<Targets>(NO_TARGETS);
  const [prefs, setPrefsState] = useState<ProfilePrefs>(NO_PREFS);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- read browser storage once after mount (SSR has none) */
    setProfileState(loadProfile());
    setResumeState(loadResume());
    const c = readKey<LastCheck>(KEYS.lastCheck);
    setLastCheckState(c?.outcome && c.input ? c : null);
    setTargets({ ...NO_TARGETS, ...readKey<Targets>(KEYS.targets) });
    setPrefsState(loadPrefs());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const setProfile = useCallback((p: Profile | null) => {
    if (p) saveProfile(p);
    setProfileState(p);
  }, []);
  const setPrefs = useCallback((p: ProfilePrefs) => {
    savePrefs(p);
    setPrefsState(p);
  }, []);
  const setResume = useCallback((r: ResumeData | null) => {
    if (r) saveResume(r);
    else removeResume();
    setResumeState(r);
  }, []);
  const setLastCheck = useCallback((c: LastCheck | null) => {
    writeKey(KEYS.lastCheck, c);
    setLastCheckState(c);
  }, []);
  const setTarget = useCallback((tool: keyof Targets, t: PostingContext | null) => {
    setTargets((prev) => {
      const next = { ...prev, [tool]: t };
      writeKey(KEYS.targets, next);
      return next;
    });
  }, []);
  const clearAll = useCallback(() => {
    clearMyData();
    setProfileState(null);
    setResumeState(null);
    setLastCheckState(null);
    setTargets(NO_TARGETS);
    setPrefsState(NO_PREFS);
  }, []);

  const value = useMemo(
    () => ({ ready, profile, resume, lastCheck, targets, prefs, setPrefs, setProfile, setResume, setLastCheck, setTarget, clearAll }),
    [ready, profile, resume, lastCheck, targets, prefs, setPrefs, setProfile, setResume, setLastCheck, setTarget, clearAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): State {
  const s = useContext(Ctx);
  if (!s) throw new Error("useAppState must be used inside <AppStateProvider>");
  return s;
}

export const useResume = () => {
  const { ready, resume, setResume } = useAppState();
  return { ready, resume, setResume };
};
export const useTargets = () => {
  const { ready, targets, setTarget } = useAppState();
  return { ready, targets, setTarget };
};
