import { TIER_FLAGS } from "@/lib/tiers/flags";
import { btnPrimary, headline } from "./ui";

export default function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative isolate mx-auto flex overflow-hidden min-h-[calc(100dvh-96px)] max-w-[640px] flex-col items-center justify-center px-6 py-16 text-center">
      {/* Faint ring outline, decorative only */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[min(560px,90vw)] -translate-x-1/2 -translate-y-1/2 text-accent opacity-[0.12]"
      >
        <circle cx="200" cy="200" r="170" fill="none" stroke="currentColor" strokeWidth="14" />
        <circle cx="200" cy="200" r="170" fill="none" stroke="currentColor" strokeWidth="14" strokeDasharray="620 1070" strokeLinecap="round" transform="rotate(-90 200 200)" opacity="0.7" />
      </svg>
      <h1 className={headline}>Is this offer real?</h1>
      <p className="mt-6 max-w-[34ch] text-[clamp(19px,2.4vw,24px)] leading-snug text-muted">
        Paste a recruiter message and see the evidence in seconds
      </p>
      <div className="mt-10 w-full sm:w-auto">
        <button type="button" onClick={onStart} className={btnPrimary}>
          Get started
        </button>
      </div>
      <p className="mt-14 max-w-[44ch] text-[14px] leading-relaxed text-muted">
        Your message is sent to an AI and a search service to run the check. Nothing is stored.
        {TIER_FLAGS.screenshot && " Screenshots are read by an AI to copy the text, then thrown away."}
      </p>
    </section>
  );
}
