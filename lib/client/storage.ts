// Typed localStorage helpers (spec.md > Browser Storage). Values are JSON-encoded.
// Every call is wrapped so a blocked/full/unavailable store never throws into the UI.
import type { Profile, ResumeData, Theme } from "../types";

export const KEYS = {
  profile: "is:profile",
  resume: "is:resume",
  theme: "is:theme",
  tracker: "is:tracker", // Tier 2: TrackerCard[]
  tailored: "is:tailored", // Tier 2: TailoredResume (accepted rewrites)
  interviews: "is:interviews", // Tier 3: InterviewSession[] (newest first)
  lastCheck: "is:lastCheck", // v3: last finished check { outcome, input, submit } so /check survives refresh
  prefs: "is:prefs", // v3: ProfilePrefs (target roles/companies, location, grad date) from the guided profile
  targets: "is:targets", // v3: { tailor, practice } PostingContext handed from the report/tracker to a tool
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

export function loadTheme(): Theme {
  const t = read<Theme>(KEYS.theme);
  return t === "light" || t === "dark" ? t : "system";
}
export const saveTheme = (t: Theme) => write(KEYS.theme, t);

/** Raw JSON read/write for Tier 2 stores; each feature validates its own shape. */
export const readKey = <T>(key: string): T | null => read<T>(key);
export const writeKey = (key: string, value: unknown): void => write(key, value);

/** Removes profile, resume, the last check and every tier store (not theme). The caller returns home. */
export function clearMyData(): void {
  remove(KEYS.profile);
  remove(KEYS.resume);
  remove(KEYS.tracker);
  remove(KEYS.tailored);
  remove(KEYS.interviews);
  remove(KEYS.lastCheck);
  remove(KEYS.targets);
  remove(KEYS.prefs);
}
