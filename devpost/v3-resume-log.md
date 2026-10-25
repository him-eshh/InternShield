# v3 resume decisions and integration notes

## Shipped checkpoints
- 4665e74: R1 parser round trips and original-byte zero-edit rendering.
- 84ad3f9: R2 plan + R3 shared/API guards, all five gates green (79 files / 1248 tests; eval 88/88, held-out 24/27).
- Later WIP checkpoints add reviewed screenshot fixes and further QA. Follow v3-progress-resume.md for current status.

## Needs integration
- Shell illustrations were absent in this worktree. Tailor uses the allowed lucide FilePenLine fallback; swap in TailorIllustration when supplied by shell.
- Profile currently persists resume text, not bytes. Tailor explicitly asks for the original PDF/DOCX to preserve its layout. Pasted/profile text exports as text.
- Company lookup uses existing cached/capped POST /api/intel; no changes to shared intel, Groq, scoring, configs or dependencies.
- Keep the resume-owned CSS import in ResumeTailor or move app/v3-resume.css to integration's preferred shared import location.

## Known limits / Pending Himesh
- DOCX: original ZIP entry contents and untouched paragraphs are preserved, with run formatting retained through word diffs. The HTML preview comes from the generated DOCX bytes. However, app.xml page count is saved metadata, not a Word layout measurement. No local soffice executable was available. A local WINWORD.EXE exists, but hidden COM pagination timed out after 90 seconds without exporting any PDFs; the test-created Word process (45268) was stopped and experimental helpers removed. Output pagination and rendered line widths for arbitrary DOCX files have NOT been proven. UI tells users to check Word page breaks; R4 and the overall Quality bar remain partial. This must not be called fully complete merely because metadata tests pass.
- PDF: cover/redraw preserves pages and checks each original row width using the closest standard font with at most 5% shrink. Old text remains under the cover in the PDF text layer, as anticipated by the brief. Plain-text export is offered for a clean text layer; this is not redaction.
- PDF replacement boxes use white backgrounds. Colored/textured resume backgrounds are not sampled.
- DOCX preview deliberately removes active HTML and images; hyperlink text is kept. It is a content preview, not a full Word pagination engine.
- The API accepts at most 10,000 resume characters plus a 2,000-character posting and bounded PDF geometry, within the shared request-size limit. Long or geometry-heavy documents can exceed that shared body limit.
- PDF previews now prepare all valid subsets of <=6 edits during layout checking, retaining each PNG with the exact bytes it renders. Accept/Reject switches those local pairs. Manual wording invalidates only changed combinations. Preparation uses one PDF worker, is cancellable, and publishes no partial cache.
- Timing gates measure actual browser click to completed byte-matched preview version. Preparing the PNG/byte pairs removed the repeated parse/draw cost from toggles: final first-Accept measurements 58-69ms across the four variants; second Accept and Reject also <200ms. Loading 210-220ms. All replacement/zoom shots were inspected.

## R7: live checks reserved for integration (zero live calls in this stream)
Do not read or print .env.local. Use integration's already-configured server environment. Use only the fabricated Sam Rivera fixtures and a fabricated posting; no personal resumes.

1. POST /api/intel with company=Cloudflare, role=Software Engineering Intern, kind=resume. Verify cited company guidance, cached/capped behavior and no uncited claims. This is one live route call.
2. Use /tailor with tests/fixtures/resume/one-page.pdf and a fabricated posting: "Required: Python, SQL, Excel. Preferred: React. Build small reporting tools and explain how you test data." Set company/role as above. Reuse the intel result instead of doing an additional lookup; make one POST /api/rewrite with mode=edits, parsed resume text and geometry, and cited guidance. Verify <=6 edits, no invented facts/tells, fit and character budgets, accept/reject preview and unchanged page count on download.
3. Optional last call: repeat POST /api/rewrite with facts=["React"] after explicitly confirming that made-up skill. Verify it is the only new skill permitted. Never send a new number/employer as a confirmed skill. If any prior call used the three-call allowance, skip this step.

No live lookup or model calls were made here. All Vitest and Playwright calls use mocks.
