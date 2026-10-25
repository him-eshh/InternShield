# v3 setup log

## Baseline (v3-base @ f790485, Oct 25)
- lint 0 errors (2 warnings in qa/v2-check-heldout-lint.mjs), tsc clean, vitest 73 files / 1191 tests passed, build compiles, eval 88/88 (low 35/35, 0 false positives), held-out 24/27 (misses ho-11, ho-15, ho-16).
- Gate runner: `node qa/v3-gates.mjs [lint,tsc,vitest,build,eval]` writes short results to `qa/gates-out.txt` (gitignored).

## Pending Himesh
- (none yet)
