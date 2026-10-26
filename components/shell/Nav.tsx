"use client";
// Skeleton nav (shell stream polishes it): desktop top bar + mobile bottom tab bar, on every route.
import { FilePen, House, MessagesSquare, ShieldCheck, SquareKanban, UserRound, type LucideIcon } from "lucide-react";
import * as m from "motion/react-m";
import Link from "next/link";
import { initialsOf, useProfileProgress } from "../profile/progress";
import { usePathname } from "next/navigation";
import Logo from "../Logo";
import ThemeToggle from "../ThemeToggle";
import { useMotion } from "../motion/useMotion";

type Tool = "check" | "tailor" | "practice" | "neutral";
type Tab = { href: string; label: string; Icon: LucideIcon; tool: Tool };

const TABS: Tab[] = [
  { href: "/", label: "Home", Icon: House, tool: "neutral" },
  { href: "/check", label: "Check", Icon: ShieldCheck, tool: "check" },
  { href: "/tailor", label: "Tailor", Icon: FilePen, tool: "tailor" },
  { href: "/practice", label: "Practice", Icon: MessagesSquare, tool: "practice" },
  { href: "/tracker", label: "Tracker", Icon: SquareKanban, tool: "neutral" },
];

/** Tool color for a route: drives data-tool on the page wrapper. */
export function toolFor(path: string): Tool {
  return TABS.find((t) => t.href !== "/" && path.startsWith(t.href))?.tool ?? "neutral";
}

function isActive(href: string, path: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function TabLink({ tab, path, mobile }: { tab: Tab; path: string; mobile?: boolean }) {
  const on = isActive(tab.href, path);
  const motion = useMotion();
  const { Icon } = tab;
  return (
    <Link
      href={tab.href}
      data-tool={tab.tool}
      aria-current={on ? "page" : undefined}
      className={
        mobile
          ? `relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[12px] font-medium ${on ? "text-tool-strong" : "text-fg-2"}`
          : `relative isolate inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[15px] font-medium transition-colors ${
              on ? "text-tool-strong" : "text-fg-2 hover:bg-sunken hover:text-fg"
            }`
      }
    >
      {on && <m.span aria-hidden="true" layoutId={mobile ? "mobile-tab" : "desktop-tab"} transition={motion.spring.snap} className={mobile ? "absolute inset-x-2 top-0 h-[3px] rounded-full bg-tool" : "absolute inset-0 -z-10 rounded-full bg-tool-tint"} />}
      <m.span animate={on && mobile && !motion.reduce ? { scale: [1, 1.12, 1] } : { scale: 1 }} transition={{ duration: motion.t.enter, ease: [0.22, 1, 0.36, 1] }} className={mobile && on ? "grid size-7 place-items-center rounded-[6px] bg-tool-tint" : "grid size-7 place-items-center"}><Icon size={mobile ? 21 : 18} strokeWidth={1.75} aria-hidden="true" /></m.span>
      {tab.label}
    </Link>
  );
}

export default function Nav() {
  const path = usePathname() ?? "/";
  const progress = useProfileProgress();
  const initials = initialsOf(progress.name);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
        <nav aria-label="Main" className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="InternShield home" className="inline-flex min-h-11 min-w-11 items-center rounded-full">
            <Logo />
          </Link>
          <div className="hidden items-center gap-0.5 lg:flex">
            {TABS.map((t) => (
              <TabLink key={t.href} tab={t} path={path} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden lg:block"><ThemeToggle /></span>
            <Link href="/profile" aria-label={`Profile, ${progress.count} of ${progress.total} steps done`} title="Your profile" className="flex shrink-0 items-center gap-2 rounded-full text-ink-strong"><span className="relative grid size-11 shrink-0 place-items-center">
              <svg viewBox="0 0 44 44" className="absolute inset-0 size-11 -rotate-90" aria-hidden="true">
                <circle cx="22" cy="22" r="19" fill="none" stroke="var(--border)" strokeWidth="2" />
                {/* No arc at 0: a round cap on a zero-length dash draws a stray dot above the avatar. */}
                {progress.count > 0 && <circle cx="22" cy="22" r="19" fill="none" stroke="var(--ink-strong)" strokeWidth="2" strokeDasharray={`${(progress.count / progress.total) * 119.38} 119.38`} strokeLinecap="round" />}
              </svg>
              {initials ? <span className="text-[13px] font-semibold">{initials}</span> : <UserRound size={18} strokeWidth={1.75} aria-hidden="true" />}</span><span className="hidden pr-2 text-sm font-medium lg:block">Profile</span>
            </Link>
          </div>
        </nav>
      </header>
      {/* Profile is the header avatar; five thumb destinations stay in the bottom bar. */}
      <nav
        aria-label="Tools"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {TABS.map((t) => (
          <TabLink key={t.href} tab={t} path={path} mobile />
        ))}
      </nav>
    </>
  );
}
