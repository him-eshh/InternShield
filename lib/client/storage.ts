// Typed localStorage helpers (spec.md > Browser Storage). Values are JSON-encoded.
// Every call is wrapped so a blocked/full/unavailable store never throws into the UI.
import type { PostingContext } from "../tiers/types";
import type { MotionPref, Profile, ResumeData, Theme } from "../types";

export const KEYS = {
  profile: "is:profile",
  resume: "is:resume",
  theme: "is:theme",
  motion: "is:motion",
  tracker: "is:tracker", // Tier 2: TrackerCard[]
  lastCheck: "is:lastCheck", // last finished check { outcome, input, submit } so /check survives refresh
  prefs: "is:prefs", // ProfilePrefs (target roles/companies, location, grad date) from the guided profile
  practiceActive: "is:practice-active", // the Practice session in progress (PracticeState) so a refresh can resume it
  practiceHistory: "is:practice-history", // finished Practice sessions, newest first (max 20)
  targets: "is:targets", // { tailor, practice } PostingContext handed from the report/tracker to a tool
} as const;

function read<T>(key: string): T | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the app keeps working, it just won't remember */
  }
}

function remove(key: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadProfile(): Profile | null {
  const p = read<Profile>(KEYS.profile);
  return p && typeof p.field === "string" && typeof p.level === "string"
    ? { field: p.field, level: p.level, skills: Array.isArray(p.skills) ? p.skills : [] }
    : null;
}
export const saveProfile = (p: Profile) => write(KEYS.profile, p);

export function loadResume(): ResumeData | null {
  const r = read<ResumeData>(KEYS.resume);
  return r && typeof r.text === "string" ? { text: r.text, fileName: r.fileName ?? "resume" } : null;
}
export const saveResume = (r: ResumeData) => write(KEYS.resume, r);
export const removeResume = () => remove(KEYS.resume);

/** Guided-profile answers that Profile (lib/types.ts) has no room for. All optional; Tailor and Practice may prefill from them. */
export interface ProfilePrefs {
  roles: string[];
  companies: string[];
  location: string;
  remote: boolean;
  gradDate: string; // YYYY-MM or ""
}
export const NO_PREFS: ProfilePrefs = { roles: [], companies: [], location: "", remote: false, gradDate: "" };
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
export function loadPrefs(): ProfilePrefs {
  const p = read<Partial<ProfilePrefs>>(KEYS.prefs);
  return {
    roles: strs(p?.roles),
    companies: strs(p?.companies),
    location: typeof p?.location === "string" ? p.location : "",
    remote: p?.remote === true,
    gradDate: typeof p?.gradDate === "string" ? p.gradDate : "",
  };
}
export const savePrefs = (p: ProfilePrefs) => write(KEYS.prefs, p);

/**
 * What Tailor and Practice start from. A target handed over by a report or the tracker always wins; the profile's first
 * company/role only fills in when there is no target at all, so it never overrides what the user already has or typed.
 */
export function prefillTarget(target: PostingContext | null, prefs: ProfilePrefs): PostingContext | null {
  if (target) return target;
  const company = prefs.companies[0]?.trim() || null;
  const role = prefs.roles[0]?.trim() || null;
  return company || role ? { company, role, description: null } : null;
}

export function loadTheme(): Theme {
  const t = read<Theme>(KEYS.theme);
  return t === "light" || t === "dark" ? t : "system";
}
export const saveTheme = (t: Theme) => write(KEYS.theme, t);

export function loadMotion(): MotionPref {
  const v = read<MotionPref>(KEYS.motion);
  return v === "on" || v === "reduced" ? v : "system";
}
export const saveMotion = (v: MotionPref) => write(KEYS.motion, v);

/** Raw JSON read/write for Tier 2 stores; each feature validates its own shape. */
export const readKey = <T>(key: string): T | null => read<T>(key);
export const writeKey = (key: string, value: unknown): void => write(key, value);

/** Stores earlier versions wrote and nothing reads now; "Clear my data" still removes them from browsers that kept them. */
const LEGACY_KEYS = ["is:tailored", "is:interviews"];

/** Removes profile, resume, the last check and every tool store (not theme). The caller returns home. */
export function clearMyData(): void {
  remove(KEYS.profile);
  remove(KEYS.resume);
  remove(KEYS.tracker);
  remove(KEYS.lastCheck);
  remove(KEYS.targets);
  remove(KEYS.prefs);
  remove(KEYS.practiceActive);
  remove(KEYS.practiceHistory);
  LEGACY_KEYS.forEach(remove);
}
