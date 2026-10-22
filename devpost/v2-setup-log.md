# InternShield v2 setup log

Branch `v2-base` from `main` a1a6b71. Brief: `devpost/v2-brief-setup.md`.

## Baseline (Oct 22, before any change; eslint ignores `devpost/**`)
- lint clean, tsc clean, vitest 38 files / 641 tests passed, build OK, eval 26/26.

## Steps
- 0: `devpost/**` added to eslint `globalIgnores`; research + briefs committed.
- 1: `.gitattributes` (LF everywhere, binaries `-text`), `.editorconfig`. `git add --renormalize .` changed nothing (index was already LF). `tests/shared/readFixture.ts` (`readFixture`, `normalizeEol`) used by `tests/api/transcribeDedupe.test.ts`; deliberate CRLF test in `tests/shared/readFixture.test.ts`. 643 tests.
- 2: dependencies (all `npm view <pkg> license` = MIT):
  - `motion` ^14.5.0, `sql.js` ^1.15.1, `@types/sql.js` ^1.4.11 (dev), `@codemirror/lang-sql` ^6.10.0.
  - Standing #9: `@codemirror/view` 6.43.15, `@codemirror/state` 6.7.6, `@codemirror/commands` 6.11.1 (the versions already in the lockfile).
  - Windows `npm install` pruned `node_modules/@emnapi/{runtime,core}` 1.11.3 again; re-added from the previous lockfile (needed for Linux `npm ci`). `npm ci` passes.

## Decisions (for the tools stream)
- **TypeScript in the browser:** NOT bundled. The JS worker (`public/workers/js-runner.js`, classic) loads `https://cdn.jsdelivr.net/npm/typescript@5.9.3/lib/typescript.js` via `importScripts` BEFORE `neutralize()` runs (5.9.3 = the version in our lockfile; keep them in sync), then `ts.transpileModule()`. Load it lazily, only for TypeScript runs.
- **sql.js wasm:** jsDelivr pinned to the package version: `https://cdn.jsdelivr.net/npm/sql.js@1.15.1/dist/sql-wasm.js` + `locateFile: f => "https://cdn.jsdelivr.net/npm/sql.js@1.15.1/dist/" + f`. Worker file name must be `public/workers/sql-runner.js` (the CSP header below is keyed on it). The npm package + `@types/sql.js` are for types and vitest (reference queries run in Node).
- **Worker CSP (standing #7) is already in `next.config.ts`** for `py-runner.js`, `js-runner.js`, `sql-runner.js`: `default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval' 'unsafe-eval'; connect-src https://cdn.jsdelivr.net`. New worker names need an integration change.
