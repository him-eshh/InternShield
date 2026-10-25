# v3 setup log

## Baseline (v3-base @ f790485, Oct 25)
- lint 0 errors (2 warnings in qa/v2-check-heldout-lint.mjs), tsc clean, vitest 73 files / 1191 tests passed, build compiles, eval 88/88 (low 35/35, 0 false positives), held-out 24/27 (misses ho-11, ho-15, ho-16).
- Gate runner: `node qa/v3-gates.mjs [lint,tsc,vitest,build,eval]` writes short results to `qa/gates-out.txt` (gitignored).

## Step 1: dependencies
- `lucide-react` 1.61.0 (ISC), `diff` 9.0.0 (BSD-3-Clause, ships its own types, no @types needed), `jszip` 3.10.2 (MIT OR GPL-3.0-or-later, used under MIT; was already transitive via mammoth, now explicit).
- Fonts via `next/font/google` (Bricolage Grotesque, Inter): no package.
- `npm ci --dry-run` passes; `@emnapi/runtime` + `@emnapi/core` 1.11.3 lockfile entries still present (needed by Linux `npm ci`). Full `npm ci` skipped on Windows (EPERM on locked next-swc .node file); `npm ls` resolves all three.

## Pending Himesh
- (none yet)
