"use client";
// Route content wrapper: sets the route's tool color and a fast crossfade + 8px slide on each route change.
// Enter-only (App Router unmounts the old page at once); MotionConfig reducedMotion="user" makes it instant.
// The first page load doesn't animate, so content is never hidden while the motion chunk loads.
import { m } from "motion/react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toolFor } from "./Nav";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const [seen, setSeen] = useState({ path, moved: false });
  if (seen.path !== path) setSeen({ path, moved: true }); // derive "navigated at least once" during render
  return (
    <m.main
      key={path}
      id="main"
      data-tool={toolFor(path)}
      initial={seen.moved ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="pb-24 md:pb-0"
    >
      {children}
    </m.main>
  );
}
