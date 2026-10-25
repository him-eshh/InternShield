"use client";
// / placeholder (shell stream replaces it with the real Home): v2 intro hero + one link per tool.
import Link from "next/link";
import { useRouter } from "next/navigation";
import Intro from "../Intro";
import { TABS } from "../shell/Nav";

export default function Home() {
  const router = useRouter();
  return (
    <>
      <Intro onStart={() => router.push("/check")} />
      <ul className="mx-auto grid max-w-[1120px] gap-3 px-6 pb-16 sm:grid-cols-3">
        {TABS.filter((t) => t.tool !== "neutral").map(({ href, label, Icon, tool }) => (
          <li key={href} data-tool={tool}>
            <Link href={href} className="flex items-center gap-3 rounded-[14px] border border-border bg-surface p-4 font-medium text-tool-strong shadow-[var(--shadow-1)]">
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
