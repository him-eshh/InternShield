// Shared class strings so every screen uses the same buttons, cards and headline.
// Colors follow the nearest data-tool wrapper (bg-accent = the tool color); risk colors never come from here.
export const headline = "font-display text-[clamp(36px,6vw,68px)] font-extrabold leading-[1.04] tracking-[-0.03em]";
export const subhead = "font-display text-[clamp(26px,4vw,40px)] font-bold leading-[1.1] tracking-[-0.025em]";
export const eyebrow = "text-[13px] font-semibold uppercase tracking-[0.12em] text-fg-3";
export const card = "rounded-[6px] border border-rule bg-paper-2";
/** A card that is a link or button: lifts on hover, presses on click. */
export const cardInteractive = `${card} transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-2)] active:translate-y-0`;
const btn =
  "pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-[17px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 max-sm:w-full";
export const btnPrimary = `${btn} bg-accent text-accent-contrast hover:bg-accent-hover`;
export const btnSecondary = `${btn} pressable-secondary border border-border-strong bg-paper-2 text-text hover:bg-bg-soft`;
export const btnQuiet = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-accent-fg underline-offset-4 hover:underline";
export const btnInline = "max-sm:w-auto";
export const linkClass = "text-accent-fg underline-offset-4 hover:underline";
export const pillBase =
  "pressable pressable-pill inline-flex min-h-11 items-center rounded-full border px-4 py-1.5 text-[15px]";
export const pillOn = `${pillBase} border-accent bg-accent-tint text-accent-fg font-medium`;
export const pillOff = `${pillBase} border-border-strong bg-paper-2 text-text hover:bg-bg-soft`;
export const sheet = "rounded-[6px] border border-rule bg-paper-2";
export const band = "rounded-tr-[28px] bg-tool-deep px-5 py-6 text-on-deep sm:px-8";
export const stampLabel = "inline-flex rotate-[-1deg] items-center rounded-[4px] border-2 border-current px-2 py-0.5 font-display text-[13px] font-bold uppercase tracking-[0.06em]";
export const noteLeft = "border-l-2 border-tool pl-4 text-fg-2";
export const progressTrack = "progress-track";
export const progressFill = "progress-fill";
/** Small status chip; pair with a tone from theme (never a risk color unless it is a risk result). */
export const chip = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium";
export const fieldInput =
  "min-h-12 w-full rounded-[14px] border border-border bg-card px-4 text-[17px] placeholder:text-fg-3 focus-visible:border-accent";
