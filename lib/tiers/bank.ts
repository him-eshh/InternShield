// Question bank (data/question-bank): metadata for real, public, company-tagged coding problems. Pure except loadBank().
// Never holds problem statements; the UI links to the public problem page. Sources and licenses: data/question-bank/SOURCES.md.
import type { BankQuestion } from "./types";

export type BankRole = "swe" | "frontend" | "backend" | "data" | "ml";
export type BankDifficulty = "easy" | "medium" | "hard" | "mixed";

export const BANK_ROLES: { id: BankRole; label: string }[] = [
  { id: "swe", label: "Software engineer" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "data", label: "Data" },
  { id: "ml", label: "Machine learning" },
];

/** A role keeps a question when it carries at least one of these tags. SWE keeps everything. */
export const ROLE_TAGS: Record<BankRole, string[] | null> = {
  swe: null,
  frontend: ["string", "array", "hash table", "stack", "queue", "tree", "binary tree", "recursion", "two pointers", "sliding window", "design"],
  backend: ["hash table", "heap (priority queue)", "graph", "trie", "union find", "topological sort", "shortest path", "binary search", "sorting", "design", "queue"],
  data: ["array", "hash table", "sorting", "counting", "prefix sum", "matrix", "math", "string", "heap (priority queue)", "bucket sort"],
  ml: ["math", "dynamic programming", "matrix", "geometry", "prefix sum", "greedy", "heap (priority queue)", "number theory", "combinatorics"],
};

export interface BankFilter {
  company?: string | null;
  role?: BankRole | null;
  difficulty?: BankDifficulty | null;
  topics?: string[];
}

const ALIASES: Record<string, string> = { meta: "facebook", "meta platforms": "facebook", alphabet: "google", aws: "amazon", "amazon web services": "amazon" };
export const normCompany = (name: string): string => {
  const n = name.trim().toLowerCase();
  return ALIASES[n] ?? n;
};

let cache: Promise<BankQuestion[]> | null = null;
/** Loads bank.json as its own chunk (about 300 KB), once. */
export function loadBank(): Promise<BankQuestion[]> {
  cache ??= import("@/data/question-bank/bank.json").then((m) => m.default as BankQuestion[]);
  return cache;
}

/** Questions matching every given filter. Unset or empty filters match everything. */
export function filterBank(bank: BankQuestion[], f: BankFilter): BankQuestion[] {
  const company = f.company?.trim() ? normCompany(f.company) : null;
  const roleTags = f.role ? ROLE_TAGS[f.role] : null;
  const topics = (f.topics ?? []).map((t) => t.toLowerCase());
  const level = f.difficulty && f.difficulty !== "mixed" ? f.difficulty : null;
  return bank.filter(
    (q) =>
      (!company || q.companies.some((c) => normCompany(c) === company)) &&
      (!roleTags || q.tags.some((t) => roleTags.includes(t))) &&
      (!level || q.difficulty.toLowerCase() === level) &&
      (topics.length === 0 || topics.some((t) => q.tags.includes(t))),
  );
}

/** Company names in the bank, most-asked first. */
export function bankCompanies(bank: BankQuestion[]): string[] {
  return countBy(bank.flatMap((q) => q.companies));
}
/** Topic tags in the bank, most common first. */
export function bankTopics(bank: BankQuestion[]): string[] {
  return countBy(bank.flatMap((q) => q.tags));
}
function countBy(xs: string[]): string[] {
  const n = new Map<string, number>();
  for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([x]) => x);
}
