"use client";
// /profile: four optional steps, each saves the moment you change it. Nothing in the app sends you back here.
import { Check, ChevronDown, FileText, Plus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { readResume, spottedSkills } from "@/lib/client/resume";
import { layoutLost, lineKind } from "@/lib/tiers/resumeLines";
import type { Field, UserLevel } from "@/lib/types";
import { ProfileIllustration } from "../illustrations";
import { FIELD_LABELS, LEVEL_NAMES } from "../ProfileSteps";
import { useAppState } from "../shell/AppStateProvider";
import { btnPrimary, card, chip, eyebrow, fieldInput, linkClass, pillOff, pillOn } from "../ui";
import { STEPS, resumeName, useProfileProgress, type StepId } from "./progress";
// resumeName is also used by the avatar in the nav.

const ROLE_IDEAS = ["Software engineering intern", "Data analyst intern", "Product intern", "Marketing intern", "Finance intern", "Design intern"];
const SKILL_IDEAS: Record<Field, string[]> = {
  tech: ["Python", "JavaScript", "React", "SQL", "Git"],
  business: ["Excel", "Marketing", "Sales", "Data analysis"],
  finance: ["Excel", "Financial modeling", "Accounting", "SQL"],
  design: ["Figma", "Prototyping", "Typography", "Photoshop"],
  other: ["Writing", "Research", "Public speaking", "Excel"],
};

/** Chips plus an add box. Calls onChange with the new list; the parent saves. */
function ChipInput({ label, items, onChange, ideas, max, placeholder }: { label: string; items: string[]; onChange: (next: string[]) => void; ideas?: string[]; max: number; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const id = `chip-${label.toLowerCase().replace(/\W+/g, "-")}`;
  const add = (raw: string) => {
    const v = raw.trim().slice(0, 60);
    if (!v || items.length >= max || items.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...items, v]);
  };
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
          setDraft("");
        }}
      >
        <label htmlFor={id} className="sr-only">{label}</label>
        <input id={id} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} className={fieldInput} />
        <button type="submit" className={`${pillOff} shrink-0 gap-1.5`} aria-label={`Add ${label.toLowerCase()}`}>
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" /> Add
        </button>
      </form>
      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={label}>
          {items.map((s) => (
            <li key={s}>
              <button type="button" onClick={() => onChange(items.filter((x) => x !== s))} aria-label={`Remove ${s}`} className={`${pillOn} gap-1.5 pr-3`}>
                {s}
                <X size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {ideas && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ideas.filter((s) => !items.some((x) => x.toLowerCase() === s.toLowerCase())).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className={pillOff}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeStep({ onSaved }: { onSaved: () => void }) {
  const { resume, setResume, profile } = useAppState();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [paste, setPaste] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const res = await readResume(file);
    setBusy(false);
    if (res.ok) {
      setResume(res.data);
      onSaved();
    } else setMsg(res.message);
  }

  if (resume) {
    const words = resume.text.split(/\s+/).filter(Boolean).length;
    const lines = resume.text.split("\n").filter((l) => l.trim());
    const sections = lines.filter((l) => lineKind(l) === "heading").slice(0, 8);
    const name = resumeName(resume.text);
    const skills = spottedSkills(resume.text, [...SKILL_IDEAS[profile?.field ?? "other"], ...(profile?.skills ?? [])]);
    return (
      <div>
        <div className="flex items-start gap-3 rounded-[14px] bg-ink-tint p-4">
          <FileText size={22} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-strong" />
          <div className="min-w-0 text-[15px]">
            <p className="break-words font-semibold">{resume.fileName}</p>
            <p className="text-fg-2">
              {name ? `${name} · ` : ""}{words.toLocaleString("en-US")} words
            </p>
            {sections.length > 0 && <p className="mt-1 text-fg-2">Sections: {sections.map((s) => s.replace(/[:]/g, "")).join(", ")}</p>}
            {skills.length > 0 && <p className="mt-1 text-fg-2">Skills spotted: {skills.join(", ")}</p>}
            {layoutLost(resume.text) && <p className="mt-1 text-fg-2">We couldn&apos;t keep this layout. Paste the text for best results.</p>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={pillOff} onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? "Reading..." : "Replace file"}
          </button>
          <button type="button" className={`${pillOff} gap-1.5`} onClick={() => { setResume(null); onSaved(); }}>
            <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" /> Remove
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.docx" className="sr-only" tabIndex={-1} aria-label="Replace resume file" onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }} />
        {msg && <p role="status" className="mt-3 text-[15px] text-fg-2">{msg}</p>}
      </div>
    );
  }
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files[0]); }}
        className={`flex flex-col items-center gap-2 rounded-[14px] border-2 border-dashed px-5 py-8 text-center transition-colors duration-200 ${dragging ? "border-accent bg-accent-tint" : "border-border-strong bg-surface-2"}`}
      >
        <Upload size={26} strokeWidth={1.75} aria-hidden="true" className="text-fg-3" />
        <p className="font-medium">{busy ? "Reading your resume..." : "Drop a PDF or Word file"}</p>
        <button type="button" className={pillOff} onClick={() => fileRef.current?.click()} disabled={busy}>Choose a file</button>
        <input ref={fileRef} id="resume-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" tabIndex={-1} aria-label="Resume file" onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {msg && <p role="status" className="mt-3 text-[15px] text-fg-2">{msg}</p>}
      <details className="mt-3">
        <summary className={`${linkClass} min-h-10 cursor-pointer py-2 text-[15px]`}>Paste text instead</summary>
        <label htmlFor="resume-paste" className="sr-only">Resume text</label>
        <textarea id="resume-paste" value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} className="mt-2 w-full rounded-[14px] border border-border bg-card p-3 text-[15px]" />
        <button
          type="button"
          className={`${pillOff} mt-2`}
          disabled={paste.trim().length < 40}
          onClick={() => { setResume({ text: paste.trim().slice(0, 20000), fileName: "Pasted resume" }); setPaste(""); onSaved(); }}
        >
          Save text
        </button>
      </details>
    </div>
  );
}

function AboutStep({ onSaved }: { onSaved: () => void }) {
  const { profile, setProfile, prefs, setPrefs } = useAppState();
  const [field, setField] = useState<Field | null>(profile?.field ?? null);
  const [level, setLevel] = useState<UserLevel | null>(profile?.level ?? null);
  const [location, setLocation] = useState(prefs.location);
  const skills = profile?.skills ?? [];

  function save(next: { field?: Field; level?: UserLevel; skills?: string[] }) {
    const f = next.field ?? field;
    const l = next.level ?? level;
    if (!f || !l) return;
    setProfile({ field: f, level: l, skills: next.skills ?? skills });
    onSaved();
  }
  const group = "mt-2 flex flex-wrap gap-2";
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[15px] font-medium" id="f-field">Field</p>
        <div role="group" aria-labelledby="f-field" className={group}>
          {(Object.keys(FIELD_LABELS) as Field[]).map((f) => (
            <button key={f} type="button" aria-pressed={field === f} className={field === f ? pillOn : pillOff} onClick={() => { setField(f); save({ field: f }); }}>
              {FIELD_LABELS[f]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[15px] font-medium" id="f-level">Where you are</p>
        <div role="group" aria-labelledby="f-level" className={group}>
          {(Object.keys(LEVEL_NAMES) as UserLevel[]).map((l) => (
            <button key={l} type="button" aria-pressed={level === l} className={level === l ? pillOn : pillOff} onClick={() => { setLevel(l); save({ level: l }); }}>
              {LEVEL_NAMES[l]}
            </button>
          ))}
        </div>
        {!profile && (field || level) && <p className="mt-2 text-[14px] text-fg-3">Pick both to save.</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="f-grad" className="text-[15px] font-medium">Graduation <span className="font-normal text-fg-3">(optional)</span></label>
          <input id="f-grad" type="month" value={prefs.gradDate} onChange={(e) => { setPrefs({ ...prefs, gradDate: e.target.value }); onSaved(); }} className={`${fieldInput} mt-1.5`} />
        </div>
        <div>
          <label htmlFor="f-loc" className="text-[15px] font-medium">Location <span className="font-normal text-fg-3">(optional)</span></label>
          <input
            id="f-loc"
            value={location}
            maxLength={80}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={() => { if (location !== prefs.location) { setPrefs({ ...prefs, location: location.trim() }); onSaved(); } }}
            placeholder="City or region"
            className={`${fieldInput} mt-1.5`}
          />
        </div>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
        <input type="checkbox" checked={prefs.remote} onChange={(e) => { setPrefs({ ...prefs, remote: e.target.checked }); onSaved(); }} className="size-5 accent-[var(--ink)]" />
        Open to remote roles
      </label>
      {profile && (
        <div>
          <p className="mb-2 text-[15px] font-medium">Skills <span className="font-normal text-fg-3">(optional)</span></p>
          <ChipInput label="Skills" items={skills} max={20} placeholder="Type a skill, press Enter" ideas={SKILL_IDEAS[profile.field]} onChange={(next) => save({ skills: next })} />
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { ready, profile, resume, prefs, setPrefs, clearAll } = useAppState();
  const prog = useProfileProgress();
  const [open, setOpen] = useState<StepId | null>(null);
  const [savedFlash, setSavedFlash] = useState<StepId | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialised, setInitialised] = useState(false);

  // Open the first unfinished step once storage has loaded.
  useEffect(() => {
    if (!ready || initialised) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time default once browser storage is read */
    setOpen(STEPS.find((s) => !prog.done[s.id])?.id ?? null);
    setInitialised(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [ready, initialised, prog.done]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!ready) return <div className="min-h-[60dvh]" aria-busy="true" />;

  const flash = (id: StepId) => {
    setSavedFlash(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSavedFlash(null), 2400);
  };
  const next = (id: StepId) => setOpen(STEPS[STEPS.findIndex((s) => s.id === id) + 1]?.id ?? null);

  const summary: Record<StepId, string> = {
    resume: resume ? resume.fileName : "Not added yet",
    roles: prefs.roles.length ? prefs.roles.join(", ") : "None picked",
    companies: prefs.companies.length ? prefs.companies.join(", ") : "Optional",
    about: profile ? `${FIELD_LABELS[profile.field]}, ${LEVEL_NAMES[profile.level]}` : "Not set",
  };

  return (
    <section className="mx-auto max-w-[760px] px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-5">
        <div className="hidden shrink-0 sm:block"><ProfileIllustration size={132} /></div>
        <div>
          <p className={eyebrow}>Profile</p>
          <h1 className="mt-1 font-display text-[clamp(30px,5vw,44px)] font-extrabold leading-[1.08] tracking-[-0.03em]">Set up once, skip the typing</h1>
          <p className="mt-2 max-w-[52ch] text-[16px] text-fg-2">Prefills Tailor and Practice. Stays on this device; only the AI calls that need it see it.</p>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <p className="num text-[15px] font-semibold" aria-live="polite">{prog.count} of {prog.total} done</p>
        <div
          role="progressbar"
          aria-label="Profile progress"
          aria-valuemin={0}
          aria-valuemax={prog.total}
          aria-valuenow={prog.count}
          aria-valuetext={`${prog.count} of ${prog.total} done`}
          className="h-2 flex-1 overflow-hidden rounded-full bg-sunken"
        >
          <div className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out" style={{ width: `${(prog.count / prog.total) * 100}%` }} />
        </div>
      </div>

      <ol className="mt-5 flex flex-col gap-3">
        {STEPS.map((s, i) => {
          const isOpen = open === s.id;
          const done = prog.done[s.id];
          return (
            <li key={s.id} className={`${card} overflow-hidden`}>
              <h2>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`step-${s.id}`}
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left sm:px-5"
                >
                  <span aria-hidden="true" className={`num grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-semibold ${done ? "bg-ink text-on-ink" : "border border-border-strong text-fg-2"}`}>
                    {done ? <Check size={16} strokeWidth={2.25} /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[18px] font-bold leading-tight">{s.title}</span>
                    <span className="block truncate text-[14px] text-fg-3">
                      <span className="sr-only">{done ? "Done. " : "Not done. "}</span>
                      {summary[s.id]}
                    </span>
                  </span>
                  {savedFlash === s.id && (
                    <span className={`${chip} animate-enter bg-ink-tint text-ink-strong`}>
                      <Check size={14} strokeWidth={2.25} aria-hidden="true" /> Saved
                    </span>
                  )}
                  <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" className={`shrink-0 text-fg-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
              </h2>
              {isOpen && (
                <div id={`step-${s.id}`} className="animate-enter border-t border-border px-4 pb-5 pt-4 sm:px-5">
                  {s.id === "resume" && <ResumeStep onSaved={() => flash("resume")} />}
                  {s.id === "roles" && (
                    <ChipInput label="Target roles" items={prefs.roles} max={8} ideas={ROLE_IDEAS} placeholder="e.g. Backend intern" onChange={(roles) => { setPrefs({ ...prefs, roles }); flash("roles"); }} />
                  )}
                  {s.id === "companies" && (
                    <ChipInput label="Target companies" items={prefs.companies} max={10} placeholder="Add a company" onChange={(companies) => { setPrefs({ ...prefs, companies }); flash("companies"); }} />
                  )}
                  {s.id === "about" && <AboutStep onSaved={() => flash("about")} />}
                  {i < STEPS.length - 1 && (
                    <div className="mt-5 flex items-center gap-4">
                      <button type="button" className={btnPrimary} onClick={() => next(s.id)}>{done ? "Next step" : "Skip for now"}</button>
                    </div>
                  )}
                  {i === STEPS.length - 1 && (
                    <div className="mt-5"><button type="button" className={btnPrimary} onClick={() => setOpen(null)}>Done</button></div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {(profile || resume || prefs.roles.length > 0 || prefs.companies.length > 0) && (
        <div className="mt-8 text-center text-[14px] text-fg-3">
          {confirmClear ? (
            <p role="alert" className="flex flex-wrap items-center justify-center gap-3">
              Remove your profile, resume, tracker and saved results from this device?
              <button type="button" className={`${linkClass} min-h-10 font-semibold`} onClick={() => { clearAll(); setConfirmClear(false); setOpen("resume"); }}>Yes, remove</button>
              <button type="button" className={`${linkClass} min-h-10`} onClick={() => setConfirmClear(false)}>Cancel</button>
            </p>
          ) : (
            <button type="button" className={`${linkClass} min-h-10`} onClick={() => setConfirmClear(true)}>Clear my data</button>
          )}
        </div>
      )}
    </section>
  );
}
