// Hand-made inline SVG illustrations, one per tool plus Profile and empty states.
// Colors come only from theme tokens (var(--coral) etc.), so they follow light/dark. Decorative: aria-hidden.
import type { SVGProps } from "react";

type P = Omit<SVGProps<SVGSVGElement>, "viewBox" | "children"> & { size?: number };

function Svg({ size = 128, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={(size * 3) / 4}
      viewBox="0 0 160 120"
      fill="none"
      aria-hidden="true"
      focusable="false"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Check: a message bubble with a magnifier holding a tick. */
export function CheckIllustration(p: P) {
  return (
    <Svg {...p}>
      <rect x="14" y="14" width="96" height="62" rx="14" fill="var(--coral-tint)" stroke="var(--coral)" strokeWidth="2.5" />
      <path d="M34 76v16l18-16" fill="var(--coral-tint)" stroke="var(--coral)" strokeWidth="2.5" />
      <path d="M30 34h56M30 46h44M30 58h30" stroke="var(--coral-strong)" strokeWidth="3" opacity="0.55" />
      <circle cx="108" cy="78" r="26" fill="var(--surface)" stroke="var(--coral-strong)" strokeWidth="4" />
      <path d="M127 97l18 17" stroke="var(--coral-strong)" strokeWidth="7" />
      <path d="M96 78l9 9 14-17" stroke="var(--coral)" strokeWidth="5" />
    </Svg>
  );
}

/** Tailor: a resume page with one highlighted line and a small sparkle of change. */
export function TailorIllustration(p: P) {
  return (
    <Svg {...p}>
      <rect x="38" y="8" width="84" height="104" rx="10" fill="var(--surface)" stroke="var(--teal)" strokeWidth="2.5" />
      <rect x="50" y="22" width="30" height="8" rx="4" fill="var(--teal-strong)" opacity="0.75" />
      <path d="M50 42h60M50 54h44" stroke="var(--fg-3)" strokeWidth="3" opacity="0.45" />
      <rect x="46" y="64" width="68" height="14" rx="5" fill="var(--teal-tint)" stroke="var(--teal)" strokeWidth="2" />
      <path d="M52 71h48" stroke="var(--teal-strong)" strokeWidth="3" />
      <path d="M50 90h60M50 100h36" stroke="var(--fg-3)" strokeWidth="3" opacity="0.45" />
      <path d="M134 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="var(--teal)" stroke="none" />
      <circle cx="24" cy="86" r="4" fill="var(--teal)" opacity="0.5" stroke="none" />
    </Svg>
  );
}

/** Practice: a speech bubble with a timer ring and a progress bar. */
export function PracticeIllustration(p: P) {
  return (
    <Svg {...p}>
      <rect x="12" y="14" width="104" height="64" rx="16" fill="var(--violet-tint)" stroke="var(--violet)" strokeWidth="2.5" />
      <path d="M92 78v18l-20-18" fill="var(--violet-tint)" stroke="var(--violet)" strokeWidth="2.5" />
      <path d="M30 34h50M30 46h36" stroke="var(--violet-strong)" strokeWidth="3" opacity="0.6" />
      <rect x="30" y="58" width="68" height="7" rx="3.5" fill="var(--surface)" stroke="var(--violet)" strokeWidth="1.5" />
      <rect x="30" y="58" width="42" height="7" rx="3.5" fill="var(--violet)" stroke="none" />
      <circle cx="122" cy="82" r="24" fill="var(--surface)" stroke="var(--violet)" strokeWidth="4" opacity="0.35" />
      <path d="M122 58a24 24 0 0 1 22.8 16.6" stroke="var(--violet-strong)" strokeWidth="5" />
      <path d="M122 82V69M122 82l9 5" stroke="var(--violet-strong)" strokeWidth="3.5" />
      <path d="M116 52h12" stroke="var(--violet-strong)" strokeWidth="3.5" />
    </Svg>
  );
}

/** Profile: a person card with a short checklist. */
export function ProfileIllustration(p: P) {
  return (
    <Svg {...p}>
      <rect x="16" y="14" width="128" height="92" rx="14" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.5" />
      <circle cx="46" cy="44" r="12" fill="var(--ink-tint)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M28 82c2-12 10-18 18-18s16 6 18 18" fill="var(--ink-tint)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M82 34h46" stroke="var(--ink)" strokeWidth="3.5" opacity="0.7" />
      <path d="M84 52l4 4 7-8M84 70l4 4 7-8" stroke="var(--teal)" strokeWidth="3" />
      <path d="M102 52h26M102 70h20" stroke="var(--fg-3)" strokeWidth="3" opacity="0.45" />
      <circle cx="89" cy="88" r="5" stroke="var(--border-strong)" strokeWidth="2" />
      <path d="M102 88h16" stroke="var(--fg-3)" strokeWidth="3" opacity="0.3" />
    </Svg>
  );
}

/** Empty states: an open, empty tray with a soft dashed card above it. */
export function EmptyIllustration(p: P) {
  return (
    <Svg {...p}>
      <rect x="44" y="14" width="72" height="44" rx="10" fill="var(--bg-subtle)" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="5 6" />
      <path d="M58 30h44M58 42h26" stroke="var(--fg-3)" strokeWidth="3" opacity="0.35" />
      <path d="M22 70h30l6 12h44l6-12h30v28a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M22 70l12-14M138 70l-12-14" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M130 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--ink)" opacity="0.5" stroke="none" />
    </Svg>
  );
}
