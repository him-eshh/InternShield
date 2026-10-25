// SQL round (v2): made-up school data, 6 questions, result-set grader (findings 04 section 3d).
// The user's query and the reference query run on the same seeded sql.js DB in public/workers/sql-runner.js.

export interface ResultSet {
  columns: string[];
  rows: unknown[][];
}
export interface SqlProblem {
  id: string;
  title: string;
  prompt: string;
  /** Column names the answer must use (any order). */
  columns: string[];
  /** Row order is graded only when the question asks for an order. */
  ordered: boolean;
  reference: string;
}
export interface SqlGrade {
  ok: boolean;
  /** One short line, e.g. "Result matches" or "2 rows missing, 1 extra". */
  message: string;
  /** Up to 5 differing rows. */
  diffs: string[];
}

export const SQL_TABLES: { name: string; columns: string }[] = [
  { name: "students", columns: "id, name, major, year" },
  { name: "courses", columns: "id, title, dept, credits" },
  { name: "enrollments", columns: "student_id, course_id, grade (NULL = in progress)" },
];

// All names and grades are made up.
export const SQL_SCHEMA = `
CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, major TEXT NOT NULL, year INTEGER NOT NULL);
CREATE TABLE courses (id INTEGER PRIMARY KEY, title TEXT NOT NULL, dept TEXT NOT NULL, credits INTEGER NOT NULL);
CREATE TABLE enrollments (student_id INTEGER NOT NULL, course_id INTEGER NOT NULL, grade REAL);
INSERT INTO students VALUES
  (1,'Ava Chen','CS',2),(2,'Ben Ortiz','Math',3),(3,'Chloe Park','CS',4),(4,'Dev Rao','Physics',1),
  (5,'Ema Silva','Math',2),(6,'Finn Walsh','CS',1),(7,'Gia Moreno','Biology',3),(8,'Hugo Brandt','Physics',4);
INSERT INTO courses VALUES
  (1,'Databases','CS',4),(2,'Algorithms','CS',4),(3,'Linear Algebra','Math',3),
  (4,'Statistics','Math',3),(5,'Mechanics','Physics',4),(6,'Ethics','Philosophy',2);
INSERT INTO enrollments VALUES
  (1,1,91),(1,2,85),(1,4,78),(2,3,88),(2,4,93),(2,2,NULL),(3,1,95),(3,2,89),(3,3,72),
  (4,5,81),(4,3,NULL),(5,3,84),(5,4,90),(6,2,NULL),(6,1,67),(8,5,76),(8,4,NULL);
`;

export const SQL_STARTER = "SELECT *\nFROM students;";

export const SQL_PROBLEMS: SqlProblem[] = [
  {
    id: "sql-enrolled",
    title: "Who takes what",
    prompt: "List every enrollment as the student's name and the course title.",
    columns: ["name", "title"],
    ordered: false,
    reference:
      "SELECT s.name, c.title FROM enrollments e JOIN students s ON s.id = e.student_id JOIN courses c ON c.id = e.course_id;",
  },
  {
    id: "sql-majors",
    title: "Students per major",
    prompt: "Count the students in each major. Sort by the count, highest first, then by major A to Z.",
    columns: ["major", "students"],
    ordered: true,
    reference: "SELECT major, COUNT(*) AS students FROM students GROUP BY major ORDER BY students DESC, major;",
  },
  {
    id: "sql-not-enrolled",
    title: "Not enrolled",
    prompt: "Find the students who aren't enrolled in any course.",
    columns: ["name"],
    ordered: false,
    reference: "SELECT s.name FROM students s LEFT JOIN enrollments e ON e.student_id = s.id WHERE e.student_id IS NULL;",
  },
  {
    id: "sql-top-courses",
    title: "High-average courses",
    prompt:
      "Find the courses whose average finished grade is at least 85. In-progress grades are NULL and don't count. Round the average to 1 decimal.",
    columns: ["title", "avg_grade"],
    ordered: false,
    reference:
      "SELECT c.title, ROUND(AVG(e.grade), 1) AS avg_grade FROM courses c JOIN enrollments e ON e.course_id = c.id WHERE e.grade IS NOT NULL GROUP BY c.id HAVING AVG(e.grade) >= 85;",
  },
  {
    id: "sql-progress",
    title: "Finished and in progress",
    prompt:
      "For each student with at least one enrollment, count finished courses (a grade) and in-progress courses (grade is NULL).",
    columns: ["name", "finished", "in_progress"],
    ordered: false,
    reference:
      "SELECT s.name, COUNT(e.grade) AS finished, SUM(CASE WHEN e.grade IS NULL THEN 1 ELSE 0 END) AS in_progress FROM students s JOIN enrollments e ON e.student_id = s.id GROUP BY s.id;",
  },
  {
    id: "sql-rank",
    title: "Rank within a course",
    prompt:
      "Rank students by grade inside each course, highest grade = 1, ties share a rank. Finished grades only.",
    columns: ["title", "name", "grade", "rnk"],
    ordered: false,
    reference:
      "SELECT c.title, s.name, e.grade, RANK() OVER (PARTITION BY c.id ORDER BY e.grade DESC) AS rnk FROM enrollments e JOIN students s ON s.id = e.student_id JOIN courses c ON c.id = e.course_id WHERE e.grade IS NOT NULL;",
  },
];

export function getSqlProblem(id: string | null | undefined): SqlProblem | null {
  return SQL_PROBLEMS.find((p) => p.id === id) ?? null;
}

/** Same seed rule as pickProblem: non-finite -> 0, negative -> absolute value. */
export function pickSqlProblem(seed: number): SqlProblem {
  const n = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) : 0;
  return SQL_PROBLEMS[n % SQL_PROBLEMS.length];
}

/** One cell as shown to the user. */
export const showCell = (v: unknown): string => (v === null || v === undefined ? "NULL" : typeof v === "string" ? v : String(v));
const showRow = (r: unknown[]) => `(${r.map(showCell).join(", ")})`;
// ponytail: numbers compared after rounding to 9 decimals (~1e-9), not a true tolerance window.
const cellKey = (v: unknown) => (typeof v === "number" ? Math.round(v * 1e9) / 1e9 : v ?? null);
const rowKey = (r: unknown[]) => JSON.stringify(r.map(cellKey));
const norm = (c: string) => c.trim().toLowerCase();

/** Compares result sets as multisets of rows (columns matched by name; order only when `ordered`). */
export function compareResults(want: ResultSet, got: ResultSet, ordered: boolean): SqlGrade {
  const wc = want.columns.map(norm);
  const gc = got.columns.map(norm);
  if ([...wc].sort().join("\u0000") !== [...gc].sort().join("\u0000")) {
    return { ok: false, message: `Columns should be ${want.columns.join(", ")}; got ${got.columns.join(", ") || "none"}`, diffs: [] };
  }
  const idx = wc.map((c) => gc.indexOf(c));
  const rows = got.rows.map((r) => idx.map((i) => r[i]));
  const diffs: string[] = [];
  if (ordered) {
    let bad = 0;
    for (let i = 0; i < Math.max(want.rows.length, rows.length); i++) {
      const w = want.rows[i];
      const g = rows[i];
      if (w && g && rowKey(w) === rowKey(g)) continue;
      bad++;
      if (diffs.length < 5) diffs.push(`Row ${i + 1}: expected ${w ? showRow(w) : "no row"}, got ${g ? showRow(g) : "no row"}`);
    }
    return bad
      ? { ok: false, message: `${bad} ${bad === 1 ? "row differs" : "rows differ"} (order counts here)`, diffs }
      : { ok: true, message: "Result matches", diffs };
  }
  const left = new Map<string, number>();
  for (const r of rows) left.set(rowKey(r), (left.get(rowKey(r)) ?? 0) + 1);
  const missing: unknown[][] = [];
  for (const w of want.rows) {
    const n = left.get(rowKey(w)) ?? 0;
    if (n > 0) left.set(rowKey(w), n - 1);
    else missing.push(w);
  }
  const extra = rows.filter((r) => {
    const n = left.get(rowKey(r)) ?? 0;
    if (n > 0) left.set(rowKey(r), n - 1);
    return n > 0;
  });
  if (!missing.length && !extra.length) return { ok: true, message: "Result matches", diffs };
  for (const r of missing) if (diffs.length < 5) diffs.push(`Missing ${showRow(r)}`);
  for (const r of extra) if (diffs.length < 5) diffs.push(`Extra ${showRow(r)}`);
  return { ok: false, message: `Rows: ${missing.length} missing, ${extra.length} extra`, diffs };
}

export interface SampleTable {
  name: string;
  columns: string[];
  rows: string[][];
}
/** The seeded tables as rows to preview (parsed from SQL_SCHEMA, so the preview can never drift from the data the query runs on). */
export function sampleTables(schema: string = SQL_SCHEMA): SampleTable[] {
  const tables = new Map<string, SampleTable>();
  for (const m of schema.matchAll(/CREATE TABLE (\w+) \(([^;]*?)\);/g)) {
    tables.set(m[1], { name: m[1], columns: m[2].split(",").map((c) => c.trim().split(/\s+/)[0]), rows: [] });
  }
  for (const m of schema.matchAll(/INSERT INTO (\w+) VALUES([^;]*);/g)) {
    const t = tables.get(m[1]);
    if (!t) continue;
    for (const row of m[2].matchAll(/\(((?:'[^']*'|[^()'])*)\)/g)) {
      const cells = [...row[1].matchAll(/'([^']*)'|([^,]+)/g)].map((c) => (c[1] ?? c[2]).trim());
      t.rows.push(cells);
    }
  }
  return [...tables.values()];
}
