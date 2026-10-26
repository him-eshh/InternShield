// Application tracker logic (devpost/tier2-spec.md > Slice 9). Pure reducers plus is:tracker storage.
// Every reducer returns a new array; the input is never changed.
import type { RiskLevel } from "../types";
import { KEYS, readKey, writeKey } from "../client/storage";
import { MAX_JOB_CHARS, TRACKER_COLUMNS, type NewCard, type TrackerCard, type TrackerColumn } from "./types";

const MAX_CARDS = 200;
const MAX_NOTES = 500;

const COLUMNS = TRACKER_COLUMNS.map((c) => c.id);
const RISKS: RiskLevel[] = ["low", "medium", "high"];

/** The link only if it is an http(s) URL; it's shown, never fetched. */
function cleanLink(link: unknown): string | null {
  if (typeof link !== "string") return null;
  const t = link.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:" ? t : null;
  } catch {
    return null;
  }
}

function isCard(x: unknown): x is TrackerCard {
  if (!x || typeof x !== "object") return false;
  const c = x as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    c.id.length > 0 &&
    typeof c.company === "string" &&
    typeof c.role === "string" &&
    (c.link === null || (typeof c.link === "string" && cleanLink(c.link) !== null)) &&
    (c.risk === null || RISKS.includes(c.risk as RiskLevel)) &&
    COLUMNS.includes(c.column as TrackerColumn) &&
    typeof c.notes === "string" &&
    (c.description === undefined || c.description === null || typeof c.description === "string") &&
    typeof c.createdAt === "number" &&
    Number.isFinite(c.createdAt)
  );
}

export function loadCards(): TrackerCard[] {
  const raw = readKey<unknown>(KEYS.tracker);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isCard)
    .slice(0, MAX_CARDS)
    .map((c) => ({
      id: c.id,
      company: c.company,
      role: c.role,
      link: c.link,
      risk: c.risk,
      column: c.column,
      notes: c.notes.slice(0, MAX_NOTES),
      description: typeof c.description === "string" ? c.description.slice(0, MAX_JOB_CHARS) : null,
      createdAt: c.createdAt,
    }));
}

export function saveCards(cards: TrackerCard[]): void {
  writeKey(KEYS.tracker, cards.slice(0, MAX_CARDS));
}

function newId(now: number): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const dupKey = (company: string, role: string, link: string | null) =>
  `${company.toLowerCase()}\u0000${role.toLowerCase()}\u0000${(link ?? "").toLowerCase()}`;

/** Adds a card at the front. Missing company/role or a duplicate company+role+link leaves the list as is. */
export function addCard(
  cards: TrackerCard[],
  c: NewCard & { column?: TrackerColumn; notes?: string; description?: string | null },
  now: number = Date.now(),
  id?: string,
): TrackerCard[] {
  const company = (c.company ?? "").trim();
  const role = (c.role ?? "").trim();
  if (!company) return cards; // role is optional: reports don't always name one
  const link = cleanLink(c.link);
  const key = dupKey(company, role, link);
  if (cards.some((x) => dupKey(x.company.trim(), x.role.trim(), x.link) === key)) return cards;
  const card: TrackerCard = {
    id: id ?? newId(now),
    company,
    role,
    link,
    risk: c.risk && RISKS.includes(c.risk) ? c.risk : null,
    column: c.column && COLUMNS.includes(c.column) ? c.column : "saved",
    notes: (c.notes ?? "").trim().slice(0, MAX_NOTES),
    description: c.description?.trim().slice(0, MAX_JOB_CHARS) || null,
    createdAt: now,
  };
  return [card, ...cards].slice(0, MAX_CARDS);
}

/** One column left (-1) or right (1), clamped to Saved..Interviewing. */
export function moveCard(cards: TrackerCard[], id: string, dir: -1 | 1): TrackerCard[] {
  return cards.map((c) => {
    if (c.id !== id) return c;
    const at = COLUMNS.indexOf(c.column);
    const next = COLUMNS[Math.min(COLUMNS.length - 1, Math.max(0, at + dir))];
    return next === c.column ? c : { ...c, column: next };
  });
}

export function updateNotes(cards: TrackerCard[], id: string, notes: string): TrackerCard[] {
  return cards.map((c) => (c.id === id ? { ...c, notes: (notes ?? "").slice(0, MAX_NOTES) } : c));
}

export function updateDescription(cards: TrackerCard[], id: string, description: string): TrackerCard[] {
  return cards.map((c) => (c.id === id ? { ...c, description: description.trim().slice(0, MAX_JOB_CHARS) || null } : c));
}

export function removeCard(cards: TrackerCard[], id: string): TrackerCard[] {
  return cards.filter((c) => c.id !== id);
}
