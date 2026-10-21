// Simple one-column Letter PDF from resume lines. pdf-lib is loaded on demand.

const REPLACEMENTS: Record<string, string> = {
  "‘": "'", "’": "'", "‚": "'", "“": '"', "”": '"', "„": '"',
  "–": "-", "—": "-", "−": "-", "…": "...", " ": " ", "•": "-", "\t": " ",
};

// WinAnsi 0x80-0x9F characters pdf-lib's standard fonts can draw (quotes, dashes, bullet are mapped above).
const WIN1252_EXTRA = "€ƒ†‡ˆ‰Š‹ŒŽ˜™š›œžŸ";

/** Replace characters the standard Helvetica (WinAnsi) font can't draw. */
export function toWinAnsi(s: string): string {
  let out = "";
  for (const ch of s) {
    const rep = REPLACEMENTS[ch];
    if (rep !== undefined) out += rep;
    else {
      const c = ch.codePointAt(0) ?? 0;
      out += (c >= 0x20 && c <= 0x7e) || (c >= 0xa1 && c <= 0xff) || WIN1252_EXTRA.includes(ch) ? ch : "?";
    }
  }
  return out;
}

// "•" starts a bullet on its own; "-" and "*" only when followed by a space.
const BULLET_RE = /^(?:•\s*|[-*]\s+)/;

export async function buildResumePdf(lines: string[], title = "Resume"): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(toWinAnsi(title));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const SIZE = 10.5;
  const LEADING = 14.5;
  const M = 54;
  const W = 612;
  const H = 792;
  const INDENT = 14;
  const maxW = W - M * 2;

  let page = doc.addPage([W, H]);
  let y = H - M;
  y -= SIZE; // first baseline
  // Pages are added lazily, only when something needs drawing below the bottom margin.
  const ensure = () => {
    if (y < M) {
      page = doc.addPage([W, H]);
      y = H - M - SIZE;
    }
  };

  const wrap = (text: string, width: number): string[] => {
    const rows: string[] = [];
    let cur = "";
    for (const word of text.split(/\s+/).filter(Boolean)) {
      let w = word;
      // Break a single word that is wider than the line.
      while (font.widthOfTextAtSize(w, SIZE) > width) {
        let n = w.length - 1;
        while (n > 1 && font.widthOfTextAtSize(w.slice(0, n), SIZE) > width) n--;
        if (cur) { rows.push(cur); cur = ""; }
        rows.push(w.slice(0, n));
        w = w.slice(n);
      }
      const next = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(next, SIZE) <= width) cur = next;
      else { rows.push(cur); cur = w; }
    }
    if (cur) rows.push(cur);
    return rows;
  };

  lines.forEach((raw, idx) => {
    const isBullet = BULLET_RE.test(raw);
    const body = toWinAnsi(isBullet ? raw.replace(BULLET_RE, "") : raw);
    const x = isBullet ? M + INDENT : M;
    const rows = wrap(body, maxW - (isBullet ? INDENT : 0));
    if (rows.length === 0) return;
    if (idx > 0) y -= 3;
    rows.forEach((row, i) => {
      if (i > 0) y -= LEADING;
      ensure();
      if (isBullet && i === 0) page.drawCircle({ x: M + 4, y: y + SIZE * 0.32, size: 1.6, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(row, { x, y, size: SIZE, font, color: rgb(0.1, 0.1, 0.1) });
    });
    y -= LEADING;
  });

  return doc.save();
}

export function downloadPdf(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
