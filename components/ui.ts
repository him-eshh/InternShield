// Shared class strings so every screen uses the same buttons, cards and headline.
// Colors follow the nearest data-tool wrapper (bg-accent = the tool color); risk colors never come from here.
export const headline = "font-display text-[clamp(36px,6vw,68px)] font-extrabold leading-[1.04] tracking-[-0.03em]";
export const subhead = "font-display text-[clamp(26px,4vw,40px)] font-bold leading-[1.1] tracking-[-0.025em]";
export const eyebrow = "text-[13px] font-semibold uppercase tracking-[0.12em] text-fg-3";
export const card = "rounded-[18px] border border-border bg-card shadow-[var(--shadow-1)]";
/** A card that is a link or button: lifts on hover, presses on click. */
export const cardInteractive = `${card} transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-2)] active:translate-y-0 active:scale-[0.995]`;
const btn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-[17px] font-semibold transition-[background-color,box-shadow,transform] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-40 max-sm:w-full";
export const btnPrimary = `${btn} bg-accent text-accent-contrast shadow-[var(--shadow-1)] hover:bg-accent-hover hover:shadow-[var(--shadow-2)] active:scale-[0.98]`;
export const btnSecondary = `${btn} border border-border bg-card text-text shadow-[var(--shadow-1)] hover:bg-bg-soft active:scale-[0.98]`;
export const linkClass = "text-accent-fg underline-offset-4 hover:underline";
export const pillBase =
  "inline-flex min-h-11 items-center rounded-full border px-4 py-1.5 text-[15px] transition-[background-color,border-color,transform] duration-200 active:scale-[0.97]";
export const pillOn = `${pillBase} border-accent bg-accent-tint text-accent-fg font-medium`;
export const pillOff = `${pillBase} border-border bg-card text-text hover:bg-bg-soft`;
/** Small status chip; pair with a tone from theme (never a risk color unless it is a risk result). */
export const chip = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium";
export const fieldInput =
  "min-h-12 w-full rounded-[14px] border border-border bg-card px-4 text-[17px] placeholder:text-fg-3 focus-visible:border-accent";
