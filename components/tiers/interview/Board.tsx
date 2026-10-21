"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { addNode, connect, moveNode, removeEdge, removeNode, renameNode, setNodePosition } from "@/lib/tiers/board";
import {
  BOARD_H,
  BOARD_KINDS,
  BOARD_W,
  MAX_EDGE_LABEL,
  MAX_EDGES,
  MAX_NODE_LABEL,
  NODE_H,
  NODE_W,
  type Board as BoardData,
  type BoardKind,
  type BoardNode,
} from "@/lib/tiers/types";
import { btnSecondary, card } from "@/components/ui";

interface Props {
  board: BoardData;
  onChange: (board: BoardData) => void;
  /** Box type picked at start: "screen" for the design challenge. */
  defaultKind?: BoardKind;
}

const kindLabel = (k: BoardKind) => BOARD_KINDS.find((x) => x.id === k)?.label ?? k;
const shorten = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Point where the ray from `a`'s center toward `b`'s center leaves a's rectangle. */
function edgePoint(a: BoardNode, b: BoardNode) {
  const cx = a.x + NODE_W / 2;
  const cy = a.y + NODE_H / 2;
  const dx = b.x + NODE_W / 2 - cx;
  const dy = b.y + NODE_H / 2 - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const t = Math.min(dx === 0 ? Infinity : NODE_W / 2 / Math.abs(dx), dy === 0 ? Infinity : NODE_H / 2 / Math.abs(dy));
  return { x: cx + dx * t, y: cy + dy * t };
}

const small = "min-h-10 px-4 py-2 text-[15px] max-sm:w-auto";
const field =
  "min-h-10 rounded-[10px] border border-border bg-card px-3 py-1.5 text-[15px] text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default function Board({ board, onChange, defaultKind = "server" }: Props) {
  const markerId = `arrow-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const [kind, setKind] = useState<BoardKind>(defaultKind);
  const [selected, setSelected] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");

  const byId = (id: string | null) => board.nodes.find((n) => n.id === id) ?? null;
  const nameOf = (id: string) => byId(id)?.label || "Untitled";
  const focusNode = (id: string) =>
    requestAnimationFrame(() => svgRef.current?.querySelector<SVGGElement>(`[data-node="${id}"]`)?.focus());

  const svgPoint = (e: PointerEvent) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const doConnect = (from: string, to: string) => {
    if (from === to) return;
    const had = board.edges.length;
    const next = connect(board, from, to);
    onChange(next);
    setNote(
      next.edges.length > had
        ? `Connected ${nameOf(from)} to ${nameOf(to)}.`
        : had >= MAX_EDGES
          ? "The board has the most arrows it can hold. Remove one to add another."
          : `${nameOf(from)} is already connected to ${nameOf(to)}.`,
    );
    setConnectFrom(null);
  };

  const startConnect = (id: string) => {
    setConnectFrom(id);
    setNote(`Connecting from ${nameOf(id)}. Choose the box it points to, then press Enter. Escape cancels.`);
  };

  const startRename = (id: string) => {
    setRenaming(id);
    setDraft(byId(id)?.label ?? "");
  };

  const commitRename = () => {
    if (!renaming) return;
    const id = renaming;
    onChange(renameNode(board, id, draft.trim().slice(0, MAX_NODE_LABEL)));
    setNote(`Renamed to ${draft.trim() || "Untitled"}.`);
    setRenaming(null);
    focusNode(id);
  };

  const remove = (id: string) => {
    const name = nameOf(id);
    // Keep keyboard focus on the board: move it to a neighbouring box (if any) after the removal.
    const idx = board.nodes.findIndex((n) => n.id === id);
    const neighbour = board.nodes[idx + 1] ?? board.nodes[idx - 1];
    if (neighbour) focusNode(neighbour.id);
    onChange(removeNode(board, id));
    setSelected(null);
    if (connectFrom === id) setConnectFrom(null);
    setNote(`Removed ${name}.`);
  };

  const onNodeKey = (e: KeyboardEvent<SVGGElement>, n: BoardNode) => {
    const step = e.shiftKey ? 40 : 10;
    const dirs: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (dirs[e.key]) {
      e.preventDefault();
      const [dx, dy] = dirs[e.key];
      const next = moveNode(board, n.id, dx, dy);
      onChange(next);
      const m = next.nodes.find((x: BoardNode) => x.id === n.id);
      if (m) setNote(`${n.label || "Untitled"} moved to ${Math.round(m.x)}, ${Math.round(m.y)}.`);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (connectFrom && connectFrom !== n.id) doConnect(connectFrom, n.id);
      else if (e.key === "Enter") startRename(n.id);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(n.id);
    } else if (e.key === "c" || e.key === "C") {
      e.preventDefault();
      startConnect(n.id);
    } else if (e.key === "Escape" && connectFrom) {
      setConnectFrom(null);
      setNote("Connection cancelled.");
    }
  };

  const onDown = (e: PointerEvent<SVGGElement>, n: BoardNode) => {
    setSelected(n.id);
    if (connectFrom) return;
    const p = svgPoint(e);
    drag.current = { id: n.id, dx: p.x - n.x, dy: p.y - n.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<SVGGElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = svgPoint(e);
    d.moved = true;
    onChange(setNodePosition(board, d.id, p.x - d.dx, p.y - d.dy));
  };
  const onUp = (e: PointerEvent<SVGGElement>, n: BoardNode) => {
    const d = drag.current;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d?.moved) {
      const m = byId(n.id);
      if (m) setNote(`${n.label || "Untitled"} moved to ${Math.round(m.x)}, ${Math.round(m.y)}.`);
    }
  };
  const onClickNode = (n: BoardNode) => {
    if (connectFrom && connectFrom !== n.id) doConnect(connectFrom, n.id);
  };

  const add = () => {
    const r = addNode(board, kind);
    if (!r.id) {
      setNote("The board is full. Remove a box to add another.");
      return;
    }
    onChange(r.board);
    setSelected(r.id);
    setNote(`Added ${kindLabel(kind)} box.`);
    focusNode(r.id);
  };

  const setEdgeLabel = (id: string, label: string) =>
    onChange({ ...board, edges: board.edges.map((x) => (x.id === id ? { ...x, label: label.slice(0, MAX_EDGE_LABEL) } : x)) });

  const exportPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const root = getComputedStyle(document.documentElement);
    let xml = new XMLSerializer().serializeToString(svg);
    xml = xml.replace(/var\((--[a-z-]+)\)/g, (_, name: string) => root.getPropertyValue(name).trim() || "#888");
    if (!/xmlns=/.test(xml.slice(0, 200))) xml = xml.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    xml = xml.replace(/<svg([^>]*?)\swidth="[^"]*"/, "<svg$1").replace("<svg", `<svg width="${BOARD_W}" height="${BOARD_H}"`);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = BOARD_W * 2;
      canvas.height = BOARD_H * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "board.png";
        a.click();
        URL.revokeObjectURL(url);
        setNote("Board exported as board.png.");
      }, "image/png");
    };
    img.onerror = () => setNote("Could not export the board.");
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  };

  const sel = byId(selected);
  const renamingNode = byId(renaming);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Board tools">
        <label className="sr-only" htmlFor={`${markerId}-kind`}>
          Box type
        </label>
        <select id={`${markerId}-kind`} className={field} value={kind} onChange={(e) => setKind(e.target.value as BoardKind)}>
          {BOARD_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <button type="button" className={`${btnSecondary} ${small}`} onClick={add}>
          Add box
        </button>
        <button
          type="button"
          className={`${btnSecondary} ${small}`}
          disabled={!sel}
          onClick={() => sel && startConnect(sel.id)}
          aria-pressed={connectFrom !== null}
        >
          Connect
        </button>
        <button type="button" className={`${btnSecondary} ${small}`} onClick={exportPng}>
          Export PNG
        </button>
      </div>

      <p className="text-[15px] text-muted" id={`${markerId}-hint`}>
        {connectFrom
          ? `Connecting from ${nameOf(connectFrom)}: click or focus another box and press Enter. Escape cancels.`
          : board.nodes.length === 0
            ? "Add a box to start. Drag boxes to move them."
            : "Drag boxes, or focus one and use arrow keys. Enter renames, C connects, Delete removes."}
      </p>

      <div className={`${card} overflow-hidden p-0`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
          width="100%"
          role="group"
          aria-label="System design board"
          aria-describedby={`${markerId}-hint`}
          style={{ display: "block", touchAction: "none", width: "100%", height: "auto", fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
        >
          <defs>
            <pattern id={`${markerId}-grid`} width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" style={{ fill: "var(--border)" }} />
            </pattern>
            <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" style={{ fill: "var(--muted)" }} />
            </marker>
          </defs>
          <rect width={BOARD_W} height={BOARD_H} style={{ fill: "var(--bg-soft)" }} />
          <rect width={BOARD_W} height={BOARD_H} fill={`url(#${markerId}-grid)`} />

          {board.edges.map((ed) => {
            const a = byId(ed.from);
            const b = byId(ed.to);
            if (!a || !b) return null;
            const p1 = edgePoint(a, b);
            const p2 = edgePoint(b, a);
            return (
              <g key={ed.id}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  strokeWidth={2}
                  markerEnd={`url(#${markerId})`}
                  style={{ stroke: "var(--muted)" }}
                />
                {ed.label && (
                  <text
                    x={(p1.x + p2.x) / 2}
                    y={(p1.y + p2.y) / 2 - 6}
                    textAnchor="middle"
                    fontSize={13}
                    strokeWidth={4}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    style={{ fill: "var(--text)", stroke: "var(--bg-soft)" }}
                  >
                    {ed.label}
                  </text>
                )}
              </g>
            );
          })}

          {board.nodes.map((n) => {
            const isSel = n.id === selected;
            const isSrc = n.id === connectFrom;
            return (
              <g
                key={n.id}
                data-node={n.id}
                role="button"
                tabIndex={0}
                aria-label={`${kindLabel(n.kind)}: ${n.label || "Untitled"}`}
                aria-pressed={isSel}
                transform={`translate(${n.x} ${n.y})`}
                style={{ cursor: connectFrom ? "pointer" : "grab", outline: "none" }}
                onFocus={() => setSelected(n.id)}
                onKeyDown={(e) => onNodeKey(e, n)}
                onPointerDown={(e) => onDown(e, n)}
                onPointerMove={onMove}
                onPointerUp={(e) => onUp(e, n)}
                onPointerCancel={(e) => onUp(e, n)}
                onClick={() => onClickNode(n)}
              >
                <title>{`${kindLabel(n.kind)}: ${n.label || "Untitled"}`}</title>
                {isSel && (
                  <rect
                    x={-5}
                    y={-5}
                    width={NODE_W + 10}
                    height={NODE_H + 10}
                    rx={15}
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray={isSrc ? "6 4" : undefined}
                    style={{ stroke: "var(--accent)" }}
                  />
                )}
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={11}
                  strokeWidth={isSel ? 3 : 1.5}
                  style={{ fill: "var(--card)", stroke: isSel ? "var(--accent)" : "var(--border)" }}
                />
                <text x={NODE_W / 2} y={25} textAnchor="middle" fontSize={15} fontWeight={600} style={{ fill: "var(--text)" }}>
                  {shorten(n.label || "Untitled", 17)}
                </text>
                <text x={NODE_W / 2} y={43} textAnchor="middle" fontSize={11} style={{ fill: "var(--muted)" }}>
                  {kindLabel(n.kind)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {renamingNode && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            commitRename();
          }}
        >
          <label htmlFor={`${markerId}-rename`} className="text-[15px] font-medium">
            Rename {kindLabel(renamingNode.kind)}
          </label>
          <input
            id={`${markerId}-rename`}
            autoFocus
            className={`${field} min-w-0 flex-1`}
            value={draft}
            maxLength={MAX_NODE_LABEL}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setRenaming(null);
                focusNode(renamingNode.id);
              }
            }}
          />
          <button type="submit" className={`${btnSecondary} ${small}`}>
            Save name
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section aria-label="Boxes">
          <h4 className="text-[15px] font-semibold">Boxes</h4>
          {board.nodes.length === 0 ? (
            <p className="text-[15px] text-muted">None yet.</p>
          ) : (
            <ul className="mt-1 list-disc pl-5 text-[15px]">
              {board.nodes.map((n) => (
                <li key={n.id}>
                  {n.label || "Untitled"} <span className="text-muted">({kindLabel(n.kind)})</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-label="Arrows">
          <h4 className="text-[15px] font-semibold">Arrows</h4>
          {board.edges.length === 0 ? (
            <p className="text-[15px] text-muted">None yet. Select a box and press Connect.</p>
          ) : (
            <ul className="mt-1 flex flex-col gap-2 text-[15px]">
              {board.edges.map((ed) => (
                <li key={ed.id} className="flex flex-wrap items-center gap-2">
                  <span>{`${nameOf(ed.from)} → ${nameOf(ed.to)}`}</span>
                  <input
                    className={`${field} min-w-0 flex-1`}
                    aria-label={`Label for arrow ${nameOf(ed.from)} to ${nameOf(ed.to)}`}
                    placeholder="Label (optional)"
                    value={ed.label}
                    maxLength={MAX_EDGE_LABEL}
                    onChange={(e) => setEdgeLabel(ed.id, e.target.value)}
                  />
                  <button
                    type="button"
                    className={`${btnSecondary} ${small}`}
                    onClick={() => {
                      onChange(removeEdge(board, ed.id));
                      setNote(`Removed arrow ${nameOf(ed.from)} to ${nameOf(ed.to)}.`);
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {note}
      </p>
    </div>
  );
}
