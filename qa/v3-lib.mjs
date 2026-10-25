// v3 QA helpers on top of qa/lib.mjs: open any route directly with seeded state, at QA_BASE.
// Usage: const { page, browser } = await openRoute("/tailor", { width: 390, theme: "dark", profile: true, resume: RESUME });
//        await seedCheck(page, "medium");  // a finished check (persisted as is:lastCheck), then goto any route
import { BASE, mockApi, open } from "./lib.mjs";

export * from "./lib.mjs";

export const ROUTES = ["/", "/check", "/tailor", "/practice", "/tracker", "/profile"];

/** Made-up resume (never a real person's). */
export const RESUME = {
  fileName: "alex-rivera-resume.pdf",
  text: [
    "Alex Rivera",
    "alex.rivera@example.com | github.com/alexr-example",
    "EDUCATION",
    "State University, B.S. Computer Science, May 2027",
    "EXPERIENCE",
    "Software Engineering Intern, Example Labs (Summer 2026)",
    "- Built a React dashboard used by 40 internal users",
    "- Cut API response time 30% by adding Redis caching",
    "PROJECTS",
    "Trail Finder: Next.js app with Mapbox and Postgres",
    "SKILLS",
    "Python, TypeScript, React, SQL, Git",
  ].join("\n"),
};

export const PROFILE = { field: "tech", level: "student", skills: ["Python", "React"] };

/**
 * Opens a fresh browser at `route` with every /api call mocked.
 * opts: open() options (width, theme, profile = false here so first-visit is the default, resume, storage, reducedMotion)
 * plus `tracker` (TrackerCard[]) and `targets` ({ tailor, practice }).
 */
export async function openRoute(route = "/", { tracker, targets, profile = false, ...opts } = {}) {
  const storage = { ...(opts.storage ?? {}) };
  if (tracker) storage["is:tracker"] = JSON.stringify(tracker);
  if (targets) storage["is:targets"] = JSON.stringify(targets);
  const s = await open({ ...opts, profile, storage });
  const calls = await mockApi(s.page);
  await s.page.goto(BASE + route, { waitUntil: "load", timeout: 90000 });
  return { ...s, calls };
}

/** Seeds a finished check ("scam" | "real" | "medium") via the dev-only ?fixture= path; leaves the page on its report. */
export async function seedCheck(page, name = "real") {
  await page.goto(`${BASE}/check?fixture=${name}`, { waitUntil: "load", timeout: 90000 });
  await page.waitForFunction(() => localStorage.getItem("is:lastCheck"), null, { timeout: 60000 });
}

/** Active nav tab label(s) (aria-current="page"). */
export const activeTabs = (page) => page.locator('[aria-current="page"]').allInnerTexts();
