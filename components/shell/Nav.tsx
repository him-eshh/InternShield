"use client";
// Skeleton nav (shell stream polishes it): desktop top bar + mobile bottom tab bar, on every route.
import { FilePen, House, MessagesSquare, ShieldCheck, SquareKanban, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "../Logo";
import ThemeToggle from "../ThemeToggle";

export type Tool = "check" | "tailor" | "practice" | "neutral";
type Tab = { href: string; label: string; Icon: LucideIcon; tool: Tool };

export const TABS: Tab[] = [
  { href: "/", label: "Home", Icon: House, tool: "neutral" },
  { href: "/check", label: "Check", Icon: ShieldCheck, tool: "check" },
  { href: "/tailor", label: "Tailor", Icon: FilePen, tool: "tailor" },
  { href: "/practice", label: "Practice", Icon: MessagesSquare, tool: "practice" },
  { href: "/tracker", label: "Tracker", Icon: SquareKanban, tool: "neutral" },
  { href: "/profile", label: "Profile", Icon: UserRound, tool: "neutral" },
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
  const { Icon } = tab;
  return (
    <Link
      href={tab.href}
      data-tool={tab.tool}
      aria-current={on ? "page" : undefined}
      className={
        mobile
          ? `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[12px] font-medium ${on ? "text-tool-strong" : "text-fg-2"}`
          : `inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[15px] font-medium transition-colors ${
              on ? "bg-tool-tint text-tool-strong" : "text-fg-2 hover:bg-sunken hover:text-fg"
            }`
      }
    >
      <Icon size={mobile ? 22 : 18} strokeWidth={1.75} aria-hidden="true" />
      {tab.label}
    </Link>
  );
}

export default function Nav() {
  const path = usePathname() ?? "/";
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
        <nav aria-label="Main" className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="InternShield home" className="rounded-full">
            <Logo />
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {TABS.map((t) => (
              <TabLink key={t.href} tab={t} path={path} />
            ))}
          </div>
          <ThemeToggle />
        </nav>
      </header>
      {/* Mobile: Home is the logo, so the bar holds the five tools. */}
      <nav
        aria-label="Tools"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {TABS.slice(1).map((t) => (
          <TabLink key={t.href} tab={t} path={path} mobile />
        ))}
      </nav>
    </>
  );
}
