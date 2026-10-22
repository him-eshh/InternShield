import { EXAMPLES } from "@/lib/examples";
import { coverageTicks, topReasons } from "@/lib/reportView";
import { score } from "@/lib/scoring/score";
import { TIER_FLAGS } from "@/lib/tiers/flags";
import { RingView } from "./report/RiskRing";
import { btnPrimary, card, headline } from "./ui";

// The hero's mini report is the real engine run on the saved scam example, so it can't drift from the app.
const ex = EXAMPLES.scam;
const sample = score({
  text: ex.text,
  facts: ex.savedSteps.extract.status === "done" ? ex.savedSteps.extract.data : null,
  steps: ex.savedSteps,
  profile: null,
  resumeText: null,
  source: ex.source,
  stage: ex.stage,
  answers: {},
  form: ex.form,
});

const FACTS = [
  "No account, nothing stored",
  "Score from fixed rules, not AI",
  "Every flag quotes the message",
];

export default function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="mx-auto grid min-h-[calc(100dvh-96px)] max-w-[1120px] items-center gap-12 px-6 py-16 md:grid-cols-[1.15fr_1fr]">
      <div>
        <h1 className={headline}>Is this offer real?</h1>
        <p className="mt-6 max-w-[34ch] text-[clamp(19px,2.4vw,24px)] leading-snug text-muted">
          Paste a recruiter message. See the evidence.
        </p>
        <div className="mt-10 w-full sm:w-auto">
          <button type="button" onClick={onStart} className={btnPrimary}>
            Get started
          </button>
        </div>
        <ul className="mt-12 flex flex-col gap-2 text-[14px] text-muted sm:flex-row sm:flex-wrap sm:gap-x-6">
          {FACTS.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-[52ch] text-[13px] leading-relaxed text-muted">
          Your message goes to an AI and a search service for the check.
          {TIER_FLAGS.screenshot && " Screenshots are read by AI, then discarded."}
        </p>
      </div>
      <figure aria-label="Example report for a made-up scam message" className={`${card} p-6 sm:p-8`}>
        <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted">Example report</p>
        <div className="mt-4 [&_h2]:text-[28px]">
          <RingView value={sample.score} score={sample.score} level={sample.level} ticks={coverageTicks(sample.coverage)} />
        </div>
        <ul className="mt-6 flex flex-col gap-3 text-[15px]">
          {topReasons(sample.flags).map((f) => (
            <li key={f.id} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-bad" />
              <span>{f.title}</span>
            </li>
          ))}
        </ul>
      </figure>
    </section>
  );
}
