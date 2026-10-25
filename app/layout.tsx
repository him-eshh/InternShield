import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import MotionProvider from "@/components/MotionProvider";
import AppStateProvider from "@/components/shell/AppStateProvider";
import Nav from "@/components/shell/Nav";
import PageTransition from "@/components/shell/PageTransition";
import "./globals.css";
import "./report.css";
import "./shell.css";
import "./resume.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], axes: ["opsz"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], axes: ["opsz", "wdth"] });

export const metadata: Metadata = {
  // Vercel sets VERCEL_PROJECT_PRODUCTION_URL; locally the share image resolves against localhost.
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  title: "InternShield: is this offer real?",
  description: "Paste a recruiter message and see the evidence in seconds.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f2e8" }, // = --bg in app/theme.css
    { media: "(prefers-color-scheme: dark)", color: "#0d1220" },
  ],
};

// Runs before first paint so there's no flash of the wrong theme. "is:theme" holds a JSON string.
const themeScript = `(function(){try{var t=JSON.parse(localStorage.getItem("is:theme")||'"system"');var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-text" suppressHydrationWarning>
        <MotionProvider>
          <AppStateProvider>
            <Nav />
            <PageTransition>{children}</PageTransition>
          </AppStateProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
