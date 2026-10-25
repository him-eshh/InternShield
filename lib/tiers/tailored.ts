// Resume header detection (shared by resumeModel). Rewording and tailored-line storage moved to the v3 resume pipeline.

const BULLET = /^[•\-*●▪◦‣·–]\s*/;
const HEADER_WORDS =
  /^(?:education|(?:work|professional|relevant|research|leadership)?\s*experience|projects?|(?:technical\s+)?skills|skills\s*(?:&|and)\s*\w+|leadership|activities|awards|honors|honors\s*(?:&|and)\s*awards|certifications?|summary|objective|profile|publications|volunteer(?:ing)?|involvement|(?:relevant\s+)?coursework|interests|languages|extracurriculars?)\s*:?$/i;

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function isHeader(line: string): boolean {
  const t = line.trim();
  if (!t || BULLET.test(t)) return false;
  if (HEADER_WORDS.test(t)) return true;
  // SHORT ALL-CAPS lines ("EXPERIENCE", "SKILLS & TOOLS") read as headers too.
  const letters = t.replace(/[^a-z]/gi, "");
  return letters.length >= 3 && t.length <= 40 && words(t) <= 4 && t === t.toUpperCase() && !/\d/.test(t);
}
