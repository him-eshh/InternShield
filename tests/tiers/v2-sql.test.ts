import { beforeAll, describe, expect, it } from "vitest";
import initSqlJs, { type Database } from "sql.js";
import { compareResults, getSqlProblem, pickSqlProblem, SQL_PROBLEMS, SQL_SCHEMA, type ResultSet } from "@/lib/tiers/sql";

let db: Database;
beforeAll(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  db.exec(SQL_SCHEMA);
});

function run(q: string): ResultSet {
  const res = db.exec(q);
  const last = res[res.length - 1];
  return last ? { columns: last.columns, rows: last.values } : { columns: [], rows: [] };
}

// Hand-checked answers for the made-up data.
const EXPECTED: Record<string, unknown[][]> = {
  "sql-enrolled": [["Ava Chen", "Databases"], ["Ava Chen", "Algorithms"], ["Ava Chen", "Statistics"], ["Ben Ortiz", "Linear Algebra"], ["Ben Ortiz", "Statistics"], ["Ben Ortiz", "Algorithms"], ["Chloe Park", "Databases"], ["Chloe Park", "Algorithms"], ["Chloe Park", "Linear Algebra"], ["Dev Rao", "Mechanics"], ["Dev Rao", "Linear Algebra"], ["Ema Silva", "Linear Algebra"], ["Ema Silva", "Statistics"], ["Finn Walsh", "Algorithms"], ["Finn Walsh", "Databases"], ["Hugo Brandt", "Mechanics"], ["Hugo Brandt", "Statistics"]],
  "sql-majors": [["CS", 3], ["Math", 2], ["Physics", 2], ["Biology", 1]],
  "sql-not-enrolled": [["Gia Moreno"]],
  "sql-top-courses": [["Algorithms", 87], ["Statistics", 87]],
  "sql-progress": [["Ava Chen", 3, 0], ["Ben Ortiz", 2, 1], ["Chloe Park", 3, 0], ["Dev Rao", 1, 1], ["Ema Silva", 2, 0], ["Finn Walsh", 1, 1], ["Hugo Brandt", 1, 1]],
  "sql-rank": [["Databases", "Chloe Park", 95, 1], ["Databases", "Ava Chen", 91, 2], ["Databases", "Finn Walsh", 67, 3], ["Algorithms", "Chloe Park", 89, 1], ["Algorithms", "Ava Chen", 85, 2], ["Linear Algebra", "Ben Ortiz", 88, 1], ["Linear Algebra", "Ema Silva", 84, 2], ["Linear Algebra", "Chloe Park", 72, 3], ["Statistics", "Ben Ortiz", 93, 1], ["Statistics", "Ema Silva", 90, 2], ["Statistics", "Ava Chen", 78, 3], ["Mechanics", "Dev Rao", 81, 1], ["Mechanics", "Hugo Brandt", 76, 2]],
};

describe("SQL problems", () => {
  it("has 6 problems with unique ids and a hand-checked answer each", () => {
    expect(SQL_PROBLEMS).toHaveLength(6);
    expect(new Set(SQL_PROBLEMS.map((p) => p.id)).size).toBe(6);
    for (const p of SQL_PROBLEMS) expect(EXPECTED[p.id], p.id).toBeDefined();
  });

  for (const p of SQL_PROBLEMS) {
    it(`reference query for ${p.id} gives the expected rows`, () => {
      const got = run(p.reference);
      expect(got.columns.map((c) => c.toLowerCase())).toEqual(p.columns);
      const g = compareResults({ columns: p.columns, rows: EXPECTED[p.id] }, got, p.ordered);
      expect(g, g.diffs.join("; ")).toMatchObject({ ok: true });
    });
  }

  it("picks by seed and looks up by id", () => {
    expect(pickSqlProblem(0).id).toBe(SQL_PROBLEMS[0].id);
    expect(pickSqlProblem(-7).id).toBe(SQL_PROBLEMS[1].id);
    expect(pickSqlProblem(NaN).id).toBe(SQL_PROBLEMS[0].id);
    expect(getSqlProblem("sql-rank")?.title).toBe("Rank within a course");
    expect(getSqlProblem("nope")).toBeNull();
  });
});

describe("compareResults", () => {
  const want: ResultSet = { columns: ["name", "n"], rows: [["a", 1], ["b", 2], ["b", 2]] };

  it("matches any row order and column order when order doesn't count", () => {
    expect(compareResults(want, { columns: ["N", "Name"], rows: [[2, "b"], [1, "a"], [2, "b"]] }, false).ok).toBe(true);
  });

  it("treats rows as a multiset", () => {
    const g = compareResults(want, { columns: ["name", "n"], rows: [["a", 1], ["b", 2], ["a", 1]] }, false);
    expect(g).toMatchObject({ ok: false, message: "Rows: 1 missing, 1 extra" });
    expect(g.diffs).toEqual(["Missing (b, 2)", "Extra (a, 1)"]);
  });

  it("allows tiny float error but not real differences", () => {
    expect(compareResults({ columns: ["x"], rows: [[0.3]] }, { columns: ["x"], rows: [[0.1 + 0.2]] }, false).ok).toBe(true);
    expect(compareResults({ columns: ["x"], rows: [[84.3]] }, { columns: ["x"], rows: [[84.33]] }, false).ok).toBe(false);
  });

  it("checks order when asked and shows at most 5 diffs", () => {
    const rows = Array.from({ length: 8 }, (_, i) => [i]);
    const g = compareResults({ columns: ["x"], rows }, { columns: ["x"], rows: [...rows].reverse() }, true);
    expect(g.ok).toBe(false);
    expect(g.diffs).toHaveLength(5);
    expect(g.diffs[0]).toBe("Row 1: expected (0), got (7)");
    expect(compareResults({ columns: ["x"], rows }, { columns: ["x"], rows: rows.slice(0, 7) }, true).message).toBe("1 row differs (order counts here)");
  });

  it("names the columns when they don't match and shows NULL", () => {
    expect(compareResults(want, { columns: ["name"], rows: [] }, false).message).toBe("Columns should be name, n; got name");
    expect(compareResults({ columns: ["x"], rows: [[null]] }, { columns: ["x"], rows: [[1]] }, false).diffs[0]).toBe("Missing (NULL)");
  });
});
