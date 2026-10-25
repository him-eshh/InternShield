# v3 interview delivery log

## Validation baseline

Final application implementation: `c710ba0`. All five gates green; 78 files / 1,232 tests, eval 88/88, held-out 24/27. See `v3-interview-qa.md` for exact quality evidence and all screenshot names.

Existing uncommitted engine/API work and launcher brief updates were reviewed and preserved in `0a353b0`; nothing was discarded. No personal vault, secrets or prohibited agent files were read or edited. No push, merge, deploy or live model/intel call was made.

## Needs integration (shared files intentionally left to their owners)

- Add `is:practice-active` and `is:practice-history` to the shared clear-data operation in `lib/client/storage.ts` and refresh any mounted Practice state when clearing data.
- Home's Continue entry should read the v3 active key; the legacy `is:interviews` history remains for the old component/tests.
- Replace the Practice header icon placeholder with shell's hand-made Practice illustration when it is available. No illustration module exists in this base worktree.
- Preserve target company/role/resume handoff when merging shell's expanded profile contract; setup already consumes the base contract's `targets.practice`.
- Integration owns the brief's cross-tool summary-to-tracker seam.

## Decisions and constraints

Custom questions occupy the first round in rounds mode. SQL runs in SQL rounds; Python and TypeScript execute in coding/debugging rounds. Java, C++, Go and JavaScript use discussion. Selected bank filters are never relaxed; exhausted matches show an explicit skip/end path. Bank company tags are historical May 2022 lists, not current hiring claims.

Runtime assets use the existing public free CDNs. Provider output was not live-tested; integration may use the four-call smoke check in the final summary. Existing held-out misses (ho-11, ho-15, ho-16) and two unrelated lint warnings are unchanged.

## Pending Himesh

None for this stream. Shared integration follows its separate brief.

## Item closures

### I1: licensed question bank

Complete. 1,130 unique metadata-only public questions; both MIT datasets have pinned source commits and dates. Lazy loader and combined company/role/difficulty/topic filters pass. No statements or solutions copied.

### I2: company research shapes practice

Complete. Cited research preselects supported stages and seeds value-based STAR prompts. Unavailable or uncited research falls back to unaffiliated company-style presets. Adapter tests and mocked source/fallback browser flows pass.

### I3: configurable session setup

Complete. Eight round cards, topic chips, verbatim custom questions, all difficulties, company/preset, role, language and question/round length. Existing shared targets prefill company/role; profile/resume context is forwarded. Violet tokens, lucide icons and accessible form controls checked in all four variants.
