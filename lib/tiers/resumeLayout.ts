// Word owns pagination. Keep its run/font/paragraph settings and only remove complete words.
// This preserves the surviving glyphs in order, so a paragraph cannot need additional text width.
export const WORD_LAYOUT = "For Word, remove words without changing their order. Use a PDF for new wording.";

export function keepsWordLayout(original: string, proposed: string): boolean {
  const before = original.trim().split(/\s+/);
  const after = proposed.trim().split(/\s+/);
  if (proposed !== after.join(" ")) return false;
  let index = 0;
  for (const word of after) {
    while (index < before.length && before[index] !== word) index++;
    if (index === before.length) return false;
    index++;
  }
  return after.length <= before.length;
}
