import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Normalizes CRLF/CR to LF so fixtures read the same on Windows and Linux checkouts. */
export const normalizeEol = (s: string) => s.replace(/\r\n?/g, "\n");

/** Reads `tests/fixtures/<path>` as UTF-8 with LF line endings. */
export const readFixture = (path: string) => normalizeEol(readFileSync(join(__dirname, "..", "fixtures", path), "utf8"));
