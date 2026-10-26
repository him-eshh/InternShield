"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { loadTheme, saveTheme } from "@/lib/client/storage";
import type { Theme } from "@/lib/types";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

const OPTIONS: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: "system", label: "System", Icon: MonitorIcon },
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
];

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export default function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const [theme, setTheme] = useState<Theme>("system");
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the saved choice after mount (SSR has no storage)
    setTheme(loadTheme());
  }, []);

  // Follow the OS while "system" is selected.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme]);

  function choose(t: Theme) {
    setTheme(t);
    saveTheme(t);
    apply(t);
    if (menu.current) menu.current.open = false;
  }

  const active = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[0];
  const ActiveIcon = active.Icon;

  const list = OPTIONS.map(({ value, label, Icon }) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => choose(value)} className={`flex min-h-11 w-full items-center gap-2 rounded-[4px] px-3 text-left text-sm hover:bg-bg-subtle ${theme === value ? "bg-ink-tint font-semibold text-ink-strong" : "text-fg"}`}><Icon size={17} />{label}</button>);
  if (inline) return <div role="group" aria-label="Theme">{list}</div>;

  return (
    <details ref={menu} className="group relative inline-block">
      <summary aria-label={`Theme: ${active.label}. Choose appearance`} className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-border-strong bg-paper-2 px-3 text-fg [&::-webkit-details-marker]:hidden"><ActiveIcon size={17} /><span className="text-sm">{active.label}</span><ChevronDown size={15} aria-hidden="true" className="transition-transform group-open:rotate-180" /></summary>
      <div role="group" aria-label="Theme" className="absolute right-0 z-50 mt-2 min-w-40 rounded-[6px] border border-rule bg-paper-2 p-2 shadow-[var(--shadow-2)]">
        {list}
      </div>
    </details>
  );
}
