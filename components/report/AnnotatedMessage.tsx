"use client";
import { useEffect, useId, useState, type MouseEvent } from "react";
import type { annotate } from "@/lib/client/annotate";
import type { Flag } from "@/lib/types";

type Annotated = ReturnType<typeof annotate>;

const SHOW_EVENT = "internshield:show-mark";
const COLLAPSE_OVER = 700; // characters; about 12 lines on a phone

export const markDomId = (flagId: string) => `mk-${flagId}`;

const smooth = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

function flash(el: HTMLElement) {
  el.setAttribute("data-flash", "");
  window.setTimeout(() => el.removeAttribute("data-flash"), 1800);
}

/** Mark to card: opens a collapsed "Good signs" group if needed, scrolls, focuses and briefly highlights the card. */
export function showCard(flagId: string) {
  const el = document.getElementById(`flag-${flagId}`);
  if (!el) return;
  const group = el.closest("details");
  if (group) group.open = true;
  el.scrollIntoView({ behavior: smooth(), block: "center" });
  el.focus({ preventScroll: true });
  flash(el);
}

/** Card to mark: asks the message to expand if collapsed, then scrolls to and focuses the mark. */
export function showInMessage(flagId: string) {
  window.dispatchEvent(new CustomEvent(SHOW_EVENT, { detail: flagId }));
}

/** The pasted message with each located quote marked and numbered; every mark links to its evidence card. */
export default function AnnotatedMessage({ text, flags, annotated }: { text: string; flags: Flag[]; annotated: Annotated }) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const { segments, marks } = annotated;
  const kindOf = new Map(flags.map((f) => [f.id, f.kind]));
  const titleOf = new Map(flags.map((f) => [f.id, f.title]));
  const long = text.length > COLLAPSE_OVER || text.split("\n").length > 12;

  useEffect(() => {
    function onShow(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      setExpanded(true);
      // Wait a frame so the expanded layout is in place before scrolling.
      requestAnimationFrame(() => {
        const el = document.getElementById(markDomId(id));
        if (!el) return;
        el.scrollIntoView({ behavior: smooth(), block: "center" });
        el.focus({ preventScroll: true });
        flash(el);
      });
    }
    window.addEventListener(SHOW_EVENT, onShow);
    return () => window.removeEventListener(SHOW_EVENT, onShow);
  }, []);

  if (marks.length === 0) return null;
  const firstOf = new Set<string>();
  const kindClass = (k: string | undefined) => (k === "good" ? "am-good" : "am-red");

  function onJump(e: MouseEvent, flagId: string) {
    e.preventDefault();
    showCard(flagId);
  }

  return (
    <section aria-labelledby="annotated-title">
      <h3 id="annotated-title" className="text-[24px] font-semibold tracking-[-0.02em]">Your message</h3>
      <p className="mt-1 text-[14px] text-muted">Numbered passages match the evidence below.</p>
      <div id={bodyId} className="am-body mt-4 rounded-[18px] border border-border bg-bg-soft p-5 text-[15px] leading-[1.7]" data-collapsed={long && !expanded} onFocus={() => setExpanded(true)}>
        {segments.map((s) =>
          s.marks.length === 0 ? (
            <span key={s.start}>{s.text}</span>
          ) : (
            <span key={s.start}>
              <mark className={`am-mark ${kindClass(kindOf.get(s.marks[0].flagId))}`} onClick={() => showCard(s.marks[0].flagId)}>
                {s.text}
              </mark>
              {s.ends.map((m) => {
                const red = kindOf.get(m.flagId) !== "good";
                const first = !firstOf.has(m.flagId);
                firstOf.add(m.flagId);
                return (
                  <a
                    key={m.flagId}
                    href={`#flag-${m.flagId}`}
                    id={first ? markDomId(m.flagId) : undefined}
                    className={`am-badge ${kindClass(kindOf.get(m.flagId))}`}
                    aria-label={`${red ? "Red flag" : "Good sign"} ${m.n}: ${titleOf.get(m.flagId) ?? ""}. Go to evidence`}
                    onClick={(e) => onJump(e, m.flagId)}
                  >
                    {m.n}
                  </a>
                );
              })}
            </span>
          ),
        )}
      </div>
      {long && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 rounded-full px-3 py-1 text-[14px] text-accent-fg hover:underline"
        >
          {expanded ? "Show less" : "Show all"}
        </button>
      )}
    </section>
  );
}
