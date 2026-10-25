"use client";
// Route content wrapper: a short direction-aware enter; the shell stays in place.
// Enter-only (App Router unmounts the old page at once). The first page load doesn't animate, so content is
// never hidden while the motion chunk loads. Under reduced motion there is no initial state at all.
import * as m from "motion/react-m";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMotion } from "../motion/useMotion";
import { toolFor } from "./Nav";

const ORDER = ["/", "/check", "/tailor", "/practice", "/tracker", "/profile"];
const indexOf = (path: string) => Math.max(0, ORDER.findIndex((route) => route === path || (route !== "/" && path.startsWith(route))));

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const motion = useMotion();
  const [seen, setSeen] = useState({ path, moved: false, direction: 1 });
  if (seen.path !== path) setSeen({ path, moved: true, direction: indexOf(path) >= indexOf(seen.path) ? 1 : -1 });
  return (
    <m.main
      key={path}
      id="main"
      data-tool={toolFor(path)}
      initial={seen.moved && !motion.reduce ? { opacity: 0, x: seen.direction * 14 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: motion.t.route, ease: [0.22, 1, 0.36, 1] }}
      className="pb-[calc(var(--nav-bottom,56px)+2rem)] lg:pb-0"
    >
      {children}
    </m.main>
  );
}
