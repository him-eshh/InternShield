import { describe as group, expect, it } from "vitest";
import {
  MAX_BOARD_TEXT,
  addNode,
  connect,
  describe,
  emptyBoard,
  fromJson,
  moveNode,
  removeEdge,
  removeNode,
  renameNode,
  setNodePosition,
  toJson,
} from "@/lib/tiers/board";
import { BOARD_H, BOARD_W, MAX_EDGES, MAX_EDGE_LABEL, MAX_NODES, MAX_NODE_LABEL, NODE_H, NODE_W, type Board } from "@/lib/tiers/types";

// Made-up boxes.
function three(): Board {
  let b = emptyBoard();
  b = addNode(b, "client", "Web app").board;
  b = addNode(b, "server", "API").board;
  b = addNode(b, "database", "Users DB").board;
  return b;
}

const overlaps = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.x < b.x + NODE_W && b.x < a.x + NODE_W && a.y < b.y + NODE_H && b.y < a.y + NODE_H;

group("addNode", () => {
  it("starts empty and numbers boxes n1, n2...", () => {
    expect(emptyBoard()).toEqual({ nodes: [], edges: [] });
    const a = addNode(emptyBoard(), "client", "Web app");
    expect(a.id).toBe("n1");
    expect(a.board.nodes[0]).toMatchObject({ id: "n1", kind: "client", label: "Web app" });
    const b = addNode(a.board, "server");
    expect(b.id).toBe("n2");
  });

  it("defaults the label to the kind name and caps/cleans labels", () => {
    expect(addNode(emptyBoard(), "storage").board.nodes[0].label).toBe("File storage");
    expect(addNode(emptyBoard(), "cache", "x".repeat(99)).board.nodes[0].label).toHaveLength(MAX_NODE_LABEL);
    expect(addNode(emptyBoard(), "cache", "  Redis\n cache ").board.nodes[0].label).toBe("Redis cache");
  });

  it("treats an unknown kind as other", () => {
    expect(addNode(emptyBoard(), "spaceship" as never).board.nodes[0].kind).toBe("other");
  });

  it("numbers past the highest id in use, so ids stay unique after a removal", () => {
    const b = three();
    const r = addNode(removeNode(b, "n2"), "queue");
    expect(r.id).toBe("n4");
    expect(new Set(r.board.nodes.map((n) => n.id)).size).toBe(3);
  });

  it("places each box on a free grid slot inside the board", () => {
    let b = emptyBoard();
    for (let i = 0; i < MAX_NODES; i++) b = addNode(b, "service").board;
    expect(b.nodes).toHaveLength(MAX_NODES);
    for (const n of b.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThanOrEqual(BOARD_W - NODE_W);
      expect(n.y).toBeLessThanOrEqual(BOARD_H - NODE_H);
    }
    for (let i = 0; i < b.nodes.length; i++) for (let j = i + 1; j < b.nodes.length; j++) expect(overlaps(b.nodes[i], b.nodes[j])).toBe(false);
  });

  it("skips a slot that a moved box now covers", () => {
    const a = addNode(emptyBoard(), "client");
    const moved = setNodePosition(a.board, "n1", 200, 20);
    const b = addNode(moved, "server").board;
    expect(overlaps(b.nodes[0], b.nodes[1])).toBe(false);
  });

  it("stops at MAX_NODES and returns an empty id", () => {
    let b = emptyBoard();
    for (let i = 0; i < MAX_NODES; i++) b = addNode(b, "service").board;
    const r = addNode(b, "service");
    expect(r.board).toBe(b);
    expect(r.id).toBe("");
  });

  it("does not change the input board", () => {
    const b = emptyBoard();
    addNode(b, "client");
    expect(b.nodes).toHaveLength(0);
  });
});

group("move / position / rename", () => {
  it("moves by a delta and clamps to the board", () => {
    const b = three();
    const start = b.nodes[0];
    const m = moveNode(b, "n1", 10, 40).nodes[0];
    expect(m).toMatchObject({ x: start.x + 10, y: start.y + 40 });
    const far = moveNode(b, "n1", 99999, 99999).nodes[0];
    expect(far).toMatchObject({ x: BOARD_W - NODE_W, y: BOARD_H - NODE_H });
    const neg = moveNode(b, "n1", -99999, -99999).nodes[0];
    expect(neg).toMatchObject({ x: 0, y: 0 });
  });

  it("sets an exact position, rounded and clamped", () => {
    const b = three();
    expect(setNodePosition(b, "n2", 100.6, 50.2).nodes[1]).toMatchObject({ x: 101, y: 50 });
    expect(setNodePosition(b, "n2", 2000, -5).nodes[1]).toMatchObject({ x: BOARD_W - NODE_W, y: 0 });
  });

  it("ignores unknown ids and non-finite numbers", () => {
    const b = three();
    expect(moveNode(b, "nope", 10, 10)).toBe(b);
    expect(setNodePosition(b, "n1", Number.NaN, 10)).toBe(b);
    expect(renameNode(b, "nope", "x")).toBe(b);
  });

  it("renames with the label cap", () => {
    const b = renameNode(three(), "n2", "  Orders API  ");
    expect(b.nodes[1].label).toBe("Orders API");
    expect(renameNode(b, "n2", "y".repeat(80)).nodes[1].label).toHaveLength(MAX_NODE_LABEL);
  });
});

group("connect / removeEdge / removeNode", () => {
  it("connects with ids e1, e2 and a capped label", () => {
    let b = connect(three(), "n1", "n2", "HTTPS");
    b = connect(b, "n2", "n3", "z".repeat(50));
    expect(b.edges).toEqual([
      { id: "e1", from: "n1", to: "n2", label: "HTTPS" },
      { id: "e2", from: "n2", to: "n3", label: "z".repeat(MAX_EDGE_LABEL) },
    ]);
    expect(connect(three(), "n1", "n2").edges[0].label).toBe("");
  });

  it("refuses self, duplicate and unknown arrows; allows the reverse direction", () => {
    const b = connect(three(), "n1", "n2");
    expect(connect(b, "n1", "n1")).toBe(b);
    expect(connect(b, "n1", "n2", "again")).toBe(b);
    expect(connect(b, "n1", "n9")).toBe(b);
    expect(connect(b, "n2", "n1").edges).toHaveLength(2);
  });

  it("stops at MAX_EDGES", () => {
    let b = emptyBoard();
    for (let i = 0; i < 10; i++) b = addNode(b, "service").board;
    for (const f of b.nodes) for (const t of b.nodes) b = connect(b, f.id, t.id);
    expect(b.edges).toHaveLength(MAX_EDGES);
  });

  it("removes an arrow, and a box with all its arrows", () => {
    let b = connect(three(), "n1", "n2");
    b = connect(b, "n2", "n3");
    b = connect(b, "n1", "n3");
    expect(removeEdge(b, "e2").edges.map((e) => e.id)).toEqual(["e1", "e3"]);
    const r = removeNode(b, "n2");
    expect(r.nodes.map((n) => n.id)).toEqual(["n1", "n3"]);
    expect(r.edges).toEqual([{ id: "e3", from: "n1", to: "n3", label: "" }]);
    expect(b.nodes).toHaveLength(3);
  });
});

group("toJson / fromJson", () => {
  it("round-trips the compact form", () => {
    const b = connect(connect(three(), "n1", "n2", "HTTPS"), "n2", "n3", "SQL");
    const json = toJson(b);
    expect(json.n[0]).toEqual(["n1", "client", "Web app", b.nodes[0].x, b.nodes[0].y]);
    expect(json.e).toEqual([
      ["n1", "n2", "HTTPS"],
      ["n2", "n3", "SQL"],
    ]);
    expect(fromJson(json)).toEqual(b);
    expect(fromJson(JSON.parse(JSON.stringify(json)))).toEqual(b);
  });

  it("accepts the route's sample board and clamps positions", () => {
    const b = fromJson({ n: [["n1", "client", "Web App", -20, 9999], ["n2", "database", "Users DB", 300, 0]], e: [["n1", "n2", "reads"]] });
    expect(b?.nodes[0]).toMatchObject({ x: 0, y: BOARD_H - NODE_H });
    expect(b?.edges[0]).toEqual({ id: "e1", from: "n1", to: "n2", label: "reads" });
  });

  it.each([
    ["null", null],
    ["string", "board"],
    ["array", []],
    ["n not array", { n: "nope", e: [] }],
    ["e missing", { n: [] }],
    ["short node", { n: [["n1", "client", "A", 0]], e: [] }],
    ["bad kind", { n: [["n1", "rocket", "A", 0, 0]], e: [] }],
    ["bad id", { n: [["", "client", "A", 0, 0]], e: [] }],
    ["duplicate id", { n: [["n1", "client", "A", 0, 0], ["n1", "server", "B", 0, 0]], e: [] }],
    ["long label", { n: [["n1", "client", "x".repeat(MAX_NODE_LABEL + 1), 0, 0]], e: [] }],
    ["NaN x", { n: [["n1", "client", "A", "left", 0]], e: [] }],
    ["unknown edge end", { n: [["n1", "client", "A", 0, 0]], e: [["n1", "n2", ""]] }],
    ["self edge", { n: [["n1", "client", "A", 0, 0]], e: [["n1", "n1", ""]] }],
    ["duplicate edge", { n: [["n1", "client", "A", 0, 0], ["n2", "server", "B", 0, 0]], e: [["n1", "n2", ""], ["n1", "n2", "x"]] }],
    ["long edge label", { n: [["n1", "client", "A", 0, 0], ["n2", "server", "B", 0, 0]], e: [["n1", "n2", "y".repeat(MAX_EDGE_LABEL + 1)]] }],
    ["too many boxes", { n: Array.from({ length: MAX_NODES + 1 }, (_, i) => [`n${i + 1}`, "client", "A", 0, 0]), e: [] }],
  ])("rejects %s", (_n, raw) => {
    expect(fromJson(raw)).toBeNull();
  });

  it("rejects more than MAX_EDGES arrows", () => {
    const n = Array.from({ length: 12 }, (_, i) => [`n${i + 1}`, "service", "S", 0, 0]);
    const e: [string, string, string][] = [];
    for (let i = 1; i <= 12; i++) for (let j = 1; j <= 12; j++) if (i !== j) e.push([`n${i}`, `n${j}`, ""]);
    expect(fromJson({ n, e })).toBeNull();
  });

  it("keeps new ids unique after loading", () => {
    const b = fromJson({ n: [["n7", "client", "A", 0, 0]], e: [] })!;
    expect(addNode(b, "server").id).toBe("n8");
  });
});

group("describe", () => {
  it("lists boxes and arrows in short text", () => {
    const b = connect(connect(three(), "n1", "n2", "HTTPS"), "n2", "n3");
    expect(describe(b)).toBe('Boxes: Client "Web app", Server "API", Database "Users DB". Arrows: Web app -> API (HTTPS), API -> Users DB.');
  });

  it("handles empty boards, no arrows and untitled boxes", () => {
    expect(describe(emptyBoard())).toBe("The board is empty.");
    const b = renameNode(addNode(emptyBoard(), "queue").board, "n1", "");
    expect(describe(b)).toBe('Boxes: Queue "Untitled". Arrows: none.');
  });

  it("is capped in length", () => {
    let b = emptyBoard();
    for (let i = 0; i < MAX_NODES; i++) b = addNode(b, "service", `${"Service".padEnd(MAX_NODE_LABEL - 3, "x")}${i}`).board;
    for (const f of b.nodes) for (const t of b.nodes) b = connect(b, f.id, t.id, "w".repeat(MAX_EDGE_LABEL));
    const text = describe(b);
    expect(text.length).toBeLessThanOrEqual(MAX_BOARD_TEXT);
    expect(text.endsWith("…")).toBe(true);
  });
});
