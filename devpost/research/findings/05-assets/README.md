Reference sketches for findings/05-known-bugs.md. NOT wired into the app; copy ideas, not files.
- parseAnswer.mjs + test.mjs  : Bug C unit-aware number reader (node test.mjs -> 19/19 on the brief's tricky-input table)
- tiles.mjs + tiles.test.mjs  : Bug A tile planner, seam finder, overlap merge (node tiles.test.mjs)
- pdfLines.mjs                : Bug E pdf.js line rebuild (y-grouping + hasEOL)

Note: the prototype scripts (*.mjs) that used to sit in this folder now live in `devpost/archive/`.
