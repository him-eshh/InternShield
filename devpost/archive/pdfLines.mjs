// Reference sketch for Bug E (not wired into the app): rebuild lines from pdf.js text items.
// Group items by baseline y (transform[5]) with a tolerance relative to font height, sort by x (transform[4]),
// insert a space when the horizontal gap is larger than ~0.25 x font height, and honour hasEOL.
export async function pdfToLines(pdf) {
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const { items } = await page.getTextContent();
    const rows = [];
    for (const it of items) {
      if (!('str' in it)) continue;                       // skip marked-content items
      const x = it.transform[4], y = it.transform[5], h = Math.abs(it.transform[3]) || it.height || 10;
      let row = rows.find((r) => Math.abs(r.y - y) <= Math.max(2, h * 0.4));
      if (!row) rows.push((row = { y, h, items: [] }));
      row.items.push({ x, w: it.width, str: it.str, eol: it.hasEOL });
    }
    rows.sort((a, b) => b.y - a.y);                         // PDF y grows upward
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      let s = '', end = null;
      for (const it of r.items) {
        if (end !== null && it.x - end > r.h * 0.25 && !s.endsWith(' ') && !it.str.startsWith(' ')) s += ' ';
        s += it.str; end = it.x + it.w;
      }
      s = s.replace(/[ \t\u00a0]+/g, ' ').trim();
      if (s) lines.push(s);
    }
    lines.push('');                                          // page break
  }
  return lines;
}
