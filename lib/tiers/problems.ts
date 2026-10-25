// Live coding problems and deterministic grading (devpost/tier3-spec.md > Slice 12). Pure.
// All problems are made up. Expected outputs are plain JSON (no tuples, no NaN) with a defined order.
import type { CaseOutput, CodeTest, CodingProblem, GradeResult } from "./types";
import { DEBUG_PROBLEMS } from "./debugging";

const EPS = 1e-9;

function starter(name: string, params: string): CodingProblem["starter"] {
  return {
    python: `def ${name}(${params}):\n    # Your code here\n    pass\n`,
    javascript: `function ${name}(${params}) {\n  // Your code here\n}\n`,
  };
}

export const PROBLEMS: CodingProblem[] = [
  {
    id: "count-vowels",
    title: "Count the vowels",
    prompt:
      "Write count_vowels(s) that returns how many vowels (a, e, i, o, u, upper or lower case) are in the string s. Y is not a vowel.",
    functionName: "count_vowels",
    starter: starter("count_vowels", "s"),
    examples: [
      { args: ["hello"], expected: 2 },
      { args: ["sky"], expected: 0 },
    ],
    tests: [
      { args: [""], expected: 0 },
      { args: ["AEIOU"], expected: 5 },
      { args: ["Campus Study Room"], expected: 5 },
      { args: ["rhythm"], expected: 0 },
      { args: ["Queue it Up"], expected: 6 },
      { args: ["bcd fgh 123!"], expected: 0 },
    ],
  },
  {
    id: "reverse-words",
    title: "Reverse the words",
    prompt:
      "Write reverse_words(s) that returns the words of s in reverse order, joined by single spaces. Words are separated by one or more spaces; ignore leading and trailing spaces.",
    functionName: "reverse_words",
    starter: starter("reverse_words", "s"),
    examples: [
      { args: ["the quick fox"], expected: "fox quick the" },
      { args: ["hello"], expected: "hello" },
    ],
    tests: [
      { args: ["one two"], expected: "two one" },
      { args: ["  lots   of   space  "], expected: "space of lots" },
      { args: [""], expected: "" },
      { args: ["   "], expected: "" },
      { args: ["a b c d e"], expected: "e d c b a" },
      { args: ["Keep CASE as is"], expected: "is as CASE Keep" },
    ],
  },
  {
    id: "two-sum",
    title: "Two numbers that add up",
    prompt:
      "Write two_sum(nums, target) that returns [i, j] with i < j where nums[i] + nums[j] == target. Each input has exactly one answer, and you may not use the same position twice.",
    functionName: "two_sum",
    starter: starter("two_sum", "nums, target"),
    examples: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
    ],
    tests: [
      { args: [[3, 3], 6], expected: [0, 1] },
      { args: [[1, 5, 9, 4], 13], expected: [2, 3] },
      { args: [[-4, 10, 7, -1], 9], expected: [1, 3] },
      { args: [[0, 8, 0], 0], expected: [0, 2] },
      { args: [[5, 1, 2, 9, 8], 3], expected: [1, 2] },
      { args: [[4, 6, 1, 2], 8], expected: [1, 3] },
    ],
  },
  {
    id: "running-max",
    title: "Running maximum",
    prompt:
      "Write running_max(nums) that returns a list where position i holds the largest value among nums[0] through nums[i]. An empty list gives an empty list.",
    functionName: "running_max",
    starter: starter("running_max", "nums"),
    examples: [
      { args: [[1, 3, 2, 5, 4]], expected: [1, 3, 3, 5, 5] },
      { args: [[]], expected: [] },
    ],
    tests: [
      { args: [[7]], expected: [7] },
      { args: [[5, 4, 3]], expected: [5, 5, 5] },
      { args: [[-3, -5, -1, -2]], expected: [-3, -3, -1, -1] },
      { args: [[2, 2, 2]], expected: [2, 2, 2] },
      { args: [[0, 10, -10, 11]], expected: [0, 10, 10, 11] },
    ],
  },
  {
    id: "group-anagrams",
    title: "Group the anagrams",
    prompt:
      "Write group_anagrams(words) that groups words made of the same letters. Sort the words inside each group alphabetically, then sort the groups by their first word. All words are lowercase.",
    functionName: "group_anagrams",
    starter: starter("group_anagrams", "words"),
    examples: [
      { args: [["eat", "tea", "tan", "ate", "nat", "bat"]], expected: [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]] },
      { args: [["abc"]], expected: [["abc"]] },
    ],
    tests: [
      { args: [[]], expected: [] },
      { args: [["listen", "silent", "enlist", "google"]], expected: [["enlist", "listen", "silent"], ["google"]] },
      { args: [["b", "a", "c"]], expected: [["a"], ["b"], ["c"]] },
      { args: [["stop", "pots", "tops", "opts", "post"]], expected: [["opts", "post", "pots", "stop", "tops"]] },
      { args: [["dusty", "study", "night", "thing", "act"]], expected: [["act"], ["dusty", "study"], ["night", "thing"]] },
    ],
  },
];

export function getProblem(id: string | null | undefined): CodingProblem | null {
  return PROBLEMS.find((p) => p.id === id) ?? DEBUG_PROBLEMS.find((p) => p.id === id) ?? null;
}

const FAIL = Symbol("unencodable");

/** JSON round trip (undefined/NaN become null or vanish, like the runners' JSON output). */
function toJson(v: unknown): unknown {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? null : JSON.parse(s);
  } catch {
    return FAIL;
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= EPS;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = Object.keys(ao);
  return keys.length === Object.keys(bo).length && keys.every((k) => Object.hasOwn(bo, k) && deepEqual(ao[k], bo[k]));
}

/** Deep equality after JSON semantics; numbers within 1e-9; arrays ordered; object keys unordered. */
export function sameValue(a: unknown, b: unknown): boolean {
  const x = toJson(a);
  const y = toJson(b);
  if (x === FAIL || y === FAIL) return false;
  return deepEqual(x, y);
}

/** A case passes only when its output is ok and matches; missing outputs fail. */
export function gradeOutputs(cases: CodeTest[], outputs: CaseOutput[]): GradeResult {
  const outs = Array.isArray(outputs) ? outputs : [];
  const results = cases.map((c, i) => {
    const o = outs[i];
    return !!o && o.ok === true && sameValue(o.value, c.expected);
  });
  return { passed: results.filter(Boolean).length, total: cases.length, results };
}
