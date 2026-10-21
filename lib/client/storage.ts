// Typed localStorage helpers (spec.md > Browser Storage). Values are JSON-encoded.
// Every call is wrapped so a blocked/full/unavailable store never throws into the UI.
import type { Profile, ResumeData, Theme } from "../types";

export const KEYS = { profile: "is:profile", resume: "is:resume", theme: "is:theme" } as const;

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

export function loadTheme(): Theme {
  const t = read<Theme>(KEYS.theme);
  return t === "light" || t === "dark" ? t : "system";
}
export const saveTheme = (t: Theme) => write(KEYS.theme, t);

/** Removes profile + resume (not theme). The caller returns to the intro. */
export function clearMyData(): void {
  remove(KEYS.profile);
  remove(KEYS.resume);
}
