// System design board logic (devpost/tier3-spec.md > Slice 13). Pure reducers plus the compact JSON form.
// Every reducer returns a new board (or the same one when nothing changes); the input is never changed.
import {
  BOARD_H,
  BOARD_KINDS,
  BOARD_W,
  MAX_EDGES,
  MAX_EDGE_LABEL,
  MAX_NODES,
  MAX_NODE_LABEL,
  NODE_H,
  NODE_W,
  type Board,
  type BoardEdge,
  type BoardJson,
  type BoardKind,
  type BoardNode,
} from "./types";

/** Longest describe() text the route puts in a prompt. */
export const MAX_BOARD_TEXT = 2000;

const KINDS = BOARD_KINDS.map((k) => k.id);
const MAX_ID = 16;
const ID_RE = /^[A-Za-z0-9_-]+$/;

// Free slots for new boxes: 5 columns x 6 rows = MAX_NODES, with gaps so boxes never touch.
const GAP_X = 40;
const GAP_Y = 44;
const MARGIN = 20;

const kindLabel = (k: BoardKind) => BOARD_KINDS.find((x) => x.id === k)?.label ?? k;
const clamp = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v)));
const clampX = (x: number) => clamp(x, BOARD_W - NODE_W);
const clampY = (y: number) => clamp(y, BOARD_H - NODE_H);

/** One line, trimmed, capped. */
const cleanLabel = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Next "n<k>"/"e<k>" id above every numeric id in use, so removed ids are never reused. */
function nextId(prefix: "n" | "e", ids: string[]): string {
  let max = 0;
  for (const id of ids) {
    const m = id.startsWith(prefix) ? /^\d+$/.exec(id.slice(1)) : null;
    if (m) max = Math.max(max, Number(m[0]));
  }
  return `${prefix}${max + 1}`;
}

function slots(): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = MARGIN; y <= BOARD_H - NODE_H; y += NODE_H + GAP_Y) {
    for (let x = MARGIN; x <= BOARD_W - NODE_W; x += NODE_W + GAP_X) out.push({ x, y });
  }
  return out;
}
const SLOTS = slots();

const overlaps = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.x < b.x + NODE_W && b.x < a.x + NODE_W && a.y < b.y + NODE_H && b.y < a.y + NODE_H;

export function emptyBoard(): Board {
  return { nodes: [], edges: [] };
}

/** Adds a box on the first free grid slot. Full board: same board and id "". */
export function addNode(b: Board, kind: BoardKind, label?: string): { board: Board; id: string } {
  if (b.nodes.length >= MAX_NODES) return { board: b, id: "" };
  const k = KINDS.includes(kind) ? kind : "other";
  const id = nextId("n", b.nodes.map((n) => n.id));
  const free = SLOTS.find((s) => !b.nodes.some((n) => overlaps(s, n))) ?? SLOTS[b.nodes.length % SLOTS.length];
  const name = label === undefined ? kindLabel(k) : cleanLabel(label, MAX_NODE_LABEL);
  const node: BoardNode = { id, kind: k, label: name, x: free.x, y: free.y };
  return { board: { ...b, nodes: [...b.nodes, node] }, id };
}

/** Moves a box to (x, y), rounded and clamped. Unknown id or non-finite numbers: same board. */
export function setNodePosition(b: Board, id: string, x: number, y: number): Board {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return b;
  const node = b.nodes.find((n) => n.id === id);
  if (!node) return b;
  const nx = clampX(x);
  const ny = clampY(y);
  if (nx === node.x && ny === node.y) return b;
  return { ...b, nodes: b.nodes.map((n) => (n.id === id ? { ...n, x: nx, y: ny } : n)) };
}

export function moveNode(b: Board, id: string, dx: number, dy: number): Board {
  const node = b.nodes.find((n) => n.id === id);
  return node ? setNodePosition(b, id, node.x + dx, node.y + dy) : b;
}

export function renameNode(b: Board, id: string, label: string): Board {
  if (!b.nodes.some((n) => n.id === id)) return b;
  const name = cleanLabel(label, MAX_NODE_LABEL);
  return { ...b, nodes: b.nodes.map((n) => (n.id === id ? { ...n, label: name } : n)) };
}

/** Removes a box and every arrow to or from it. */
export function removeNode(b: Board, id: string): Board {
  return { nodes: b.nodes.filter((n) => n.id !== id), edges: b.edges.filter((e) => e.from !== id && e.to !== id) };
}

/** Adds an arrow. Self, duplicate (same direction), unknown ends or a full board: same board. */
export function connect(b: Board, from: string, to: string, label?: string): Board {
  if (from === to || b.edges.length >= MAX_EDGES) return b;
  if (!b.nodes.some((n) => n.id === from) || !b.nodes.some((n) => n.id === to)) return b;
  if (b.edges.some((e) => e.from === from && e.to === to)) return b;
  const edge: BoardEdge = { id: nextId("e", b.edges.map((e) => e.id)), from, to, label: cleanLabel(label, MAX_EDGE_LABEL) };
  return { ...b, edges: [...b.edges, edge] };
}

export function removeEdge(b: Board, id: string): Board {
  return { ...b, edges: b.edges.filter((e) => e.id !== id) };
}

/** Compact wire/storage form. Arrow ids are not kept; fromJson renumbers them e1, e2... */
export function toJson(b: Board): BoardJson {
  return {
    n: b.nodes.map((n) => [n.id, n.kind, n.label, n.x, n.y]),
    e: b.edges.map((e) => [e.from, e.to, e.label]),
  };
}

/** Validates the compact form. Any junk (bad shape, kind, id, over-long label, bad arrow, over the caps) -> null. */
export function fromJson(raw: unknown): Board | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { n, e } = raw as { n?: unknown; e?: unknown };
  if (!Array.isArray(n) || !Array.isArray(e) || n.length > MAX_NODES || e.length > MAX_EDGES) return null;

  const nodes: BoardNode[] = [];
  const ids = new Set<string>();
  for (const t of n) {
    if (!Array.isArray(t) || t.length !== 5) return null;
    const [id, kind, label, x, y] = t as unknown[];
    if (typeof id !== "string" || !id || id.length > MAX_ID || !ID_RE.test(id) || ids.has(id)) return null;
    if (typeof kind !== "string" || !KINDS.includes(kind as BoardKind)) return null;
    if (typeof label !== "string" || label.length > MAX_NODE_LABEL) return null;
    if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    ids.add(id);
    nodes.push({ id, kind: kind as BoardKind, label: cleanLabel(label, MAX_NODE_LABEL), x: clampX(x), y: clampY(y) });
  }

  const edges: BoardEdge[] = [];
  const pairs = new Set<string>();
  for (const t of e) {
    if (!Array.isArray(t) || t.length !== 3) return null;
    const [from, to, label] = t as unknown[];
    if (typeof from !== "string" || typeof to !== "string" || !ids.has(from) || !ids.has(to) || from === to) return null;
    if (typeof label !== "string" || label.length > MAX_EDGE_LABEL) return null;
    const key = `${from}\u0000${to}`;
    if (pairs.has(key)) return null;
    pairs.add(key);
    edges.push({ id: `e${edges.length + 1}`, from, to, label: cleanLabel(label, MAX_EDGE_LABEL) });
  }
  return { nodes, edges };
}

/** Short text for the prompt, e.g. `Boxes: Client "Web app". Arrows: Web app -> API (HTTPS).` Capped at MAX_BOARD_TEXT. */
export function describe(b: Board): string {
  if (b.nodes.length === 0) return "The board is empty.";
  const name = (id: string) => b.nodes.find((n) => n.id === id)?.label || "Untitled";
  const boxes = b.nodes.map((n) => `${kindLabel(n.kind)} "${n.label || "Untitled"}"`).join(", ");
  const arrows = b.edges.length
    ? b.edges.map((e) => `${name(e.from)} -> ${name(e.to)}${e.label ? ` (${e.label})` : ""}`).join(", ")
    : "none";
  const text = `Boxes: ${boxes}. Arrows: ${arrows}.`;
  return text.length > MAX_BOARD_TEXT ? `${text.slice(0, MAX_BOARD_TEXT - 1)}…` : text;
}
