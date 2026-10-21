// Shared class strings so every screen uses the same buttons, cards and headline.
export const headline = "text-[clamp(36px,6vw,72px)] font-bold leading-[1.05] tracking-[-0.025em]";
export const subhead = "text-[clamp(26px,4vw,40px)] font-bold leading-[1.1] tracking-[-0.025em]";
export const card = "rounded-[18px] border border-border bg-card";
const btn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-[17px] font-semibold transition-[opacity,background-color,transform] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-40 max-sm:w-full";
export const btnPrimary = `${btn} bg-accent text-accent-contrast hover:opacity-90 active:scale-[0.99]`;
export const btnSecondary = `${btn} border border-border bg-card text-text hover:bg-bg-soft`;
export const linkClass = "text-accent underline-offset-4 hover:underline";
export const pillBase =
  "inline-flex min-h-10 items-center rounded-full border px-4 py-1.5 text-[15px] transition-colors duration-200";
export const pillOn = `${pillBase} border-accent bg-accent/10 text-accent font-medium`;
export const pillOff = `${pillBase} border-border bg-card text-text hover:bg-bg-soft`;
