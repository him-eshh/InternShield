"use client";
import { useRef, useState } from "react";
import { readResume, spottedSkills } from "@/lib/client/resume";
import { saveProfile, saveResume } from "@/lib/client/storage";
import { layoutLost, lineKind } from "@/lib/tiers/resumeLines";
import type { Field, Profile, ResumeData, UserLevel } from "@/lib/types";
import { ArrowLeftIcon, CheckCircleIcon, CloseIcon, UploadIcon } from "./icons";
import { btnPrimary, card, linkClass, pillOff, subhead } from "./ui";

export const FIELD_LABELS: Record<Field, string> = {
  tech: "Tech",
  business: "Business",
  finance: "Finance",
  design: "Design and arts",
  other: "Other",
};
export const LEVEL_NAMES: Record<UserLevel, string> = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
  grad: "Grad student",
  new_grad: "New grad",
};

const SKILL_SUGGESTIONS: Record<Field, string[]> = {
  tech: ["Python", "JavaScript", "React", "Java", "SQL", "Git"],
  business: ["Excel", "Marketing", "Sales", "Project management", "Presentations", "Data analysis"],
  finance: ["Excel", "Financial modeling", "Accounting", "Valuation", "Bloomberg", "SQL"],
  design: ["Figma", "Photoshop", "Illustrator", "Typography", "Prototyping", "Video editing"],
  other: ["Writing", "Research", "Public speaking", "Excel", "Teamwork", "Customer service"],
};

const WHY = [
  "Helps check whether a role fits you.",
  "A role far above or below your level can be a warning sign.",
  "Optional. Helps spot roles that don't match you.",
  "Your file stays on this device. It goes to an AI only when you reword a line or practice with it.",
];

interface Props {
  initial: Profile | null;
  initialResume: ResumeData | null;
  onDone: (profile: Profile, resume: ResumeData | null) => void;
  onCancel?: () => void;
}

export default function ProfileSteps({ initial, initialResume, onDone, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [field, setField] = useState<Field | null>(initial?.field ?? null);
  const [level, setLevel] = useState<UserLevel | null>(initial?.level ?? null);
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [draft, setDraft] = useState("");
  const [resume, setResume] = useState<ResumeData | null>(initialResume);
  const [resumeMsg, setResumeMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const total = 4;
  const persist = (p: { field?: Field | null; level?: UserLevel | null; skills?: string[] }) => {
    const f = p.field ?? field;
    const l = p.level ?? level;
    if (f && l) saveProfile({ field: f, level: l, skills: p.skills ?? skills });
  };

  function addSkill(s: string) {
    const v = s.trim();
    if (!v || skills.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    const next = [...skills, v].slice(0, 20);
    setSkills(next);
    persist({ skills: next });
  }
  function removeSkill(s: string) {
    const next = skills.filter((x) => x !== s);
    setSkills(next);
    persist({ skills: next });
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setResumeMsg(null);
    const res = await readResume(file);
    setBusy(false);
    if (res.ok) {
      setResume(res.data);
      saveResume(res.data);
    } else {
      setResumeMsg(res.message);
    }
  }

  function finish() {
    if (!field || !level) return;
    const profile = { field, level, skills };
    saveProfile(profile);
    onDone(profile, resume);
  }

  function back() {
    if (step === 0) onCancel?.();
    else setStep(step - 1);
  }

  const choiceCard = (selected: boolean) =>
    `${card} w-full px-5 py-5 text-left text-[19px] font-medium transition-[border-color,background-color] duration-200 ${
      selected ? "!border-accent bg-accent/10 text-accent" : "hover:bg-bg-soft"
    }`;

  return (
    <section className="mx-auto max-w-[640px] px-6 py-10 sm:py-16">
      <div className="mb-10 flex items-center gap-4">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          disabled={step === 0 && !onCancel}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:text-text disabled:opacity-30"
        >
          <ArrowLeftIcon size={18} />
        </button>
        <div
          role="progressbar"
          aria-label="Profile progress"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step + 1}
          aria-valuetext={`Step ${step + 1} of ${total}`}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-soft"
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
      </div>

      <div key={step} className="animate-enter">
        {step === 0 && (
          <>
            <h2 className={subhead}>What are you studying or looking for?</h2>
            <div role="group" aria-label="Field" className="mt-8 grid gap-3">
              {(Object.keys(FIELD_LABELS) as Field[]).map((f) => (
                <button key={f} type="button" aria-pressed={field === f} className={choiceCard(field === f)} onClick={() => { setField(f); persist({ field: f }); }}>
                  {FIELD_LABELS[f]}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className={subhead}>Where are you in school?</h2>
            <div role="group" aria-label="Level" className="mt-8 grid gap-3 sm:grid-cols-2">
              {(Object.keys(LEVEL_NAMES) as UserLevel[]).map((l) => (
                <button key={l} type="button" aria-pressed={level === l} className={choiceCard(level === l)} onClick={() => { setLevel(l); persist({ level: l }); }}>
                  {LEVEL_NAMES[l]}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className={subhead}>Add a few skills</h2>
            <form
              className="mt-8 flex gap-2 max-sm:flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                addSkill(draft);
                setDraft("");
              }}
            >
              <label htmlFor="skill-input" className="sr-only">Skill</label>
              <input
                id="skill-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a skill and press Enter"
                className="min-h-12 flex-1 rounded-full border border-border bg-card px-5 text-[17px] placeholder:text-muted"
              />
              <button type="submit" className={`${pillOff} justify-center`}>Add</button>
            </form>
            {skills.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="Your skills">
                {skills.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => removeSkill(s)} aria-label={`Remove ${s}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent/10 py-1 pl-4 pr-3 text-[15px] text-accent">
                      {s}
                      <CloseIcon size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-8 text-[14px] text-muted">Suggestions</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SKILL_SUGGESTIONS[field ?? "other"]
                .filter((s) => !skills.includes(s))
                .map((s) => (
                  <button key={s} type="button" onClick={() => addSkill(s)} className={pillOff}>
                    + {s}
                  </button>
                ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className={subhead}>Add your resume</h2>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files[0]); }}
              className={`mt-8 flex flex-col items-center gap-3 rounded-[18px] border-2 border-dashed px-6 py-12 text-center transition-colors duration-200 ${
                dragging ? "border-accent bg-accent/10" : "border-border bg-card"
              }`}
            >
              {resume ? (
                <>
                  <span className="text-good"><CheckCircleIcon size={32} /></span>
                  <p className="font-medium">{resume.fileName}</p>
                  <p role="status" className="text-[15px]">
                    {(() => {
                      const words = resume.text.split(/\s+/).filter(Boolean).length;
                      const spotted = spottedSkills(resume.text, [...SKILL_SUGGESTIONS[field ?? "other"], ...skills]);
                      return spotted.length > 0
                        ? `${words.toLocaleString("en-US")} words read. Skills spotted: ${spotted.join(", ")}`
                        : `${words.toLocaleString("en-US")} words read. No listed skills spotted.`;
                    })()}
                  </p>
                  <p className="text-[14px] text-muted">Saved on this device.</p>
                  {(() => {
                    const lines = resume.text.split("\n").filter((l) => l.trim());
                    if (layoutLost(resume.text)) {
                      return (
                        <p className="max-w-md text-[14px] text-muted">
                          We couldn&apos;t keep this resume&apos;s layout. Paste the text instead for best results.
                        </p>
                      );
                    }
                    const TAGS = { heading: "Heading", bullet: "Bullet", contact: "Contact", text: "Text" } as const;
                    return (
                      <details className="w-full max-w-md text-left text-[14px]">
                        <summary className="cursor-pointer text-center font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                          Read {lines.length} {lines.length === 1 ? "line" : "lines"}
                        </summary>
                        <ul className="mt-3 flex flex-col gap-1.5">
                          {lines.slice(0, 8).map((l, i) => (
                            <li key={i} className="flex items-baseline gap-2">
                              <span className="w-[4.5rem] shrink-0 text-[12px] uppercase tracking-wide text-muted">{TAGS[lineKind(l)]}</span>
                              <span className="min-w-0 truncate">{l}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    );
                  })()}
                </>
              ) : (
                <>
                  <span className="text-muted"><UploadIcon size={32} /></span>
                  <p className="text-[19px] font-medium">{busy ? "Reading your resume…" : "Drop your resume here"}</p>
                  <p className="text-[14px] text-muted">PDF or Word (.docx)</p>
                </>
              )}
              <input
                ref={fileRef}
                id="resume-file"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }}
              />
              <button type="button" onClick={() => fileRef.current?.click()} className={`${pillOff} mt-2`} disabled={busy}>
                {resume ? "Choose a different file" : "Choose a file"}
              </button>
            </div>
            {resumeMsg && <p role="status" className="mt-4 text-[15px] text-muted">{resumeMsg}</p>}
          </>
        )}
        <p className="mt-6 text-[14px] leading-relaxed text-muted">{WHY[step]}</p>
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        {step < total - 1 ? (
          <button
            type="button"
            className={btnPrimary}
            disabled={(step === 0 && !field) || (step === 1 && !level)}
            onClick={() => setStep(step + 1)}
          >
            Continue
          </button>
        ) : (
          resume && (
            <button type="button" className={btnPrimary} onClick={finish} disabled={!field || !level}>
              Finish
            </button>
          )
        )}
        {step === 3 && !resume && (
          <button type="button" onClick={finish} className={`${linkClass} text-[15px]`}>
            Skip for now
          </button>
        )}
        {step === 2 && (
          <button type="button" onClick={() => setStep(3)} className={`${linkClass} text-[15px]`}>
            Skip for now
          </button>
        )}
      </div>
    </section>
  );
}
