"use client";
import { useEffect, useState } from "react";
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

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

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
  }

  return (
    <div role="group" aria-label="Theme" className="inline-flex rounded-full border border-border bg-card p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => {
        const on = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={on}
            aria-label={label}
            title={label}
            onClick={() => choose(value)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
              on ? "bg-accent text-accent-contrast" : "text-muted hover:text-text"
            }`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
