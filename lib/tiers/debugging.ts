// Debugging round (findings 04 section 4): short made-up programs with planted bugs, graded by the same hidden tests
// as live coding. Reference fixes live in tests/tiers/debugging.test.ts, so the user never gets them.
import type { CodingProblem } from "./types";

/** TS starter = the JS program with a typed signature (TS is transpiled only, so the body stays valid). */
const typed = (js: string, signature: string) => js.replace(/^function [^\n]*\{/, `${signature} {`);

const AVERAGE_JS = `function average_grade(grades) {
  let total = 0;
  let count = 0;
  for (const g of grades) {
    if (g !== null) total += g;
    count += 1;
  }
  return total / count;
}
`;
const RANGE_JS = `function count_in_range(nums, lo, hi) {
  let n = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] >= lo && nums[i] < hi) n++;
  }
  return n;
}
`;
const TOPK_JS = `function top_k(nums, k) {
  const sorted = nums.slice().sort();
  return sorted.reverse().slice(0, k);
}
`;
const PALINDROME_JS = `function is_palindrome(s) {
  const clean = s.replace(/[^a-z0-9]/g, "");
  let i = 0;
  let j = clean.length - 1;
  while (i < j) {
    if (clean[i] !== clean[j]) return false;
    i++;
    j--;
  }
  return true;
}
`;
const CHUNK_JS = `function chunk(items, size) {
  const out = [];
  for (let i = 0; i + size <= items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
`;

export const DEBUG_PROBLEMS: CodingProblem[] = [
  {
    id: "debug-average",
    title: "Average grade",
    prompt:
      "average_grade(grades) should return the average of the finished grades. In-progress grades are null (None in Python) and don't count. No finished grades returns 0. Some tests fail: find and fix the bug.",
    functionName: "average_grade",
    starter: {
      python: `def average_grade(grades):
    total = 0
    count = 0
    for g in grades:
        if g is not None:
            total += g
        count += 1
    return total / count
`,
      javascript: AVERAGE_JS,
      typescript: typed(AVERAGE_JS, "function average_grade(grades: (number | null)[]): number"),
    },
    examples: [
      { args: [[90, null, 80]], expected: 85 },
      { args: [[]], expected: 0 },
    ],
    tests: [
      { args: [[100]], expected: 100 },
      { args: [[null, null]], expected: 0 },
      { args: [[70, 80, 90]], expected: 80 },
      { args: [[null, 60]], expected: 60 },
      { args: [[]], expected: 0 },
      { args: [[88.5, null, 91.5]], expected: 90 },
    ],
  },
  {
    id: "debug-range",
    title: "Count in range",
    prompt:
      "count_in_range(nums, lo, hi) should count the numbers between lo and hi, including both ends. Some tests fail: find and fix the bug.",
    functionName: "count_in_range",
    starter: {
      python: `def count_in_range(nums, lo, hi):
    n = 0
    for i in range(len(nums)):
        if nums[i] >= lo and nums[i] < hi:
            n += 1
    return n
`,
      javascript: RANGE_JS,
      typescript: typed(RANGE_JS, "function count_in_range(nums: number[], lo: number, hi: number): number"),
    },
    examples: [
      { args: [[1, 5, 10], 1, 5], expected: 2 },
      { args: [[3, 3, 3], 3, 3], expected: 3 },
    ],
    tests: [
      { args: [[], 0, 10], expected: 0 },
      { args: [[1, 2, 3, 4], 2, 3], expected: 2 },
      { args: [[-5, 0, 5], -5, 5], expected: 3 },
      { args: [[7], 1, 6], expected: 0 },
      { args: [[10, 20, 30], 15, 30], expected: 2 },
      { args: [[2, 4, 6, 8], 0, 100], expected: 4 },
    ],
  },
  {
    id: "debug-topk",
    title: "Top scores",
    prompt:
      "top_k(nums, k) should return the k largest numbers, largest first, without changing nums. Some tests fail: find and fix the bug.",
    functionName: "top_k",
    starter: {
      python: `def top_k(nums, k):
    ordered = sorted(nums)
    return ordered[:k]
`,
      javascript: TOPK_JS,
      typescript: typed(TOPK_JS, "function top_k(nums: number[], k: number): number[]"),
    },
    examples: [
      { args: [[3, 1, 2], 2], expected: [3, 2] },
      { args: [[10, 9, 2], 2], expected: [10, 9] },
    ],
    tests: [
      { args: [[100, 20, 3], 1], expected: [100] },
      { args: [[5, 5, 1], 2], expected: [5, 5] },
      { args: [[-1, -20, 7], 3], expected: [7, -1, -20] },
      { args: [[4], 1], expected: [4] },
      { args: [[12, 3, 45, 6], 2], expected: [45, 12] },
      { args: [[1, 2, 3], 0], expected: [] },
    ],
  },
  {
    id: "debug-palindrome",
    title: "Palindrome check",
    prompt:
      "is_palindrome(s) should say whether s reads the same both ways, ignoring case, spaces and punctuation. Some tests fail: find and fix the bug.",
    functionName: "is_palindrome",
    starter: {
      python: `import re


def is_palindrome(s):
    clean = re.sub(r"[^a-z0-9]", "", s)
    i, j = 0, len(clean) - 1
    while i < j:
        if clean[i] != clean[j]:
            return False
        i += 1
        j -= 1
    return True
`,
      javascript: PALINDROME_JS,
      typescript: typed(PALINDROME_JS, "function is_palindrome(s: string): boolean"),
    },
    examples: [
      { args: ["Racecar"], expected: true },
      { args: ["ab"], expected: false },
    ],
    tests: [
      { args: [""], expected: true },
      { args: ["A man, a plan, a canal: Panama"], expected: true },
      { args: ["No lemon, no melon"], expected: true },
      { args: ["Hello"], expected: false },
      { args: ["12321"], expected: true },
      { args: ["Was it a car or a cat I saw?"], expected: true },
    ],
  },
  {
    id: "debug-chunk",
    title: "Split into chunks",
    prompt:
      "chunk(items, size) should split items into lists of size items each; the last list may be shorter. Some tests fail: find and fix the bug.",
    functionName: "chunk",
    starter: {
      python: `def chunk(items, size):
    out = []
    i = 0
    while i + size <= len(items):
        out.append(items[i:i + size])
        i += size
    return out
`,
      javascript: CHUNK_JS,
      typescript: typed(CHUNK_JS, "function chunk<T>(items: T[], size: number): T[][]"),
    },
    examples: [
      { args: [[1, 2, 3, 4], 2], expected: [[1, 2], [3, 4]] },
      { args: [[1, 2, 3], 2], expected: [[1, 2], [3]] },
    ],
    tests: [
      { args: [[], 3], expected: [] },
      { args: [[1, 2, 3, 4, 5], 2], expected: [[1, 2], [3, 4], [5]] },
      { args: [[1], 5], expected: [[1]] },
      { args: [["a", "b", "c"], 1], expected: [["a"], ["b"], ["c"]] },
      { args: [[1, 2, 3, 4, 5, 6], 3], expected: [[1, 2, 3], [4, 5, 6]] },
      { args: [[7, 8, 9, 10], 3], expected: [[7, 8, 9], [10]] },
    ],
  },
];
