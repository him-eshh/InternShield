"use client";
import { useEffect, useRef, useState } from "react";
import type { Compartment } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { CodeLanguage } from "@/lib/tiers/types";

interface Props {
  value: string;
  language: CodeLanguage;
  onChange: (v: string) => void;
  label: string;
}

async function loadLanguage(language: CodeLanguage) {
  if (language === "python") return (await import("@codemirror/lang-python")).python();
  return (await import("@codemirror/lang-javascript")).javascript();
}

export default function CodeEditor({ value, language, onChange, label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const langComp = useRef<Compartment | null>(null);
  const onChangeRef = useRef(onChange);
  const initial = useRef({ value, language, label });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ basicSetup }, { EditorView }, { Compartment }, lang] = await Promise.all([
        import("codemirror"),
        import("@codemirror/view"),
        import("@codemirror/state"),
        loadLanguage(initial.current.language),
      ]);
      if (cancelled || !host.current) return;
      const comp = new Compartment();
      langComp.current = comp;
      const theme = EditorView.theme({
        "&": { color: "var(--text)", backgroundColor: "var(--card)", fontSize: "15px", minHeight: "240px" },
        "&.cm-focused": { outline: "2px solid var(--accent)", outlineOffset: "-2px" },
        ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", minHeight: "240px", overflow: "auto" },
        ".cm-content": { caretColor: "var(--accent)" },
        ".cm-cursor": { borderLeftColor: "var(--accent)" },
        ".cm-gutters": { backgroundColor: "var(--bg-soft)", color: "var(--muted)", border: "none" },
        ".cm-activeLine": { backgroundColor: "var(--bg-soft)" },
        ".cm-activeLineGutter": { backgroundColor: "var(--bg-soft)" },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
          backgroundColor: "color-mix(in srgb, var(--accent) 25%, transparent)",
        },
        ".cm-panels, .cm-tooltip": { backgroundColor: "var(--card)", color: "var(--text)", border: "1px solid var(--border)" },
      });
      const v = new EditorView({
        doc: initial.current.value,
        parent: host.current,
        extensions: [
          basicSetup,
          comp.of(lang),
          theme,
          EditorView.contentAttributes.of({ "aria-label": initial.current.label }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          }),
        ],
      });
      view.current = v;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      view.current?.destroy();
      view.current = null;
    };
  }, []);

  // Language change.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    loadLanguage(language).then((ext) => {
      if (cancelled || !view.current || !langComp.current) return;
      view.current.dispatch({ effects: langComp.current.reconfigure(ext) });
    });
    return () => {
      cancelled = true;
    };
  }, [language, ready]);

  // External value change (language switch, reset).
  useEffect(() => {
    const v = view.current;
    if (!ready || !v) return;
    const cur = v.state.doc.toString();
    if (cur !== value) v.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
  }, [value, ready]);

  return (
    <div>
      <div
        ref={host}
        className="min-h-[240px] max-w-full overflow-hidden rounded-[14px] border border-border bg-card"
      >
        {!ready && (
          <textarea
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            className="block min-h-[240px] w-full resize-none bg-card p-3 font-mono text-[15px] text-text"
          />
        )}
      </div>
      <p className="mt-2 text-[13px] text-muted">Press Esc then Tab to leave the editor.</p>
    </div>
  );
}
