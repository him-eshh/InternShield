import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import MotionProvider from "@/components/MotionProvider";
import "./globals.css";
import "./v2-check.css";
import "./v2-tools.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  // Vercel sets VERCEL_PROJECT_PRODUCTION_URL; locally the share image resolves against localhost.
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  title: "InternShield: is this offer real?",
  description: "Paste a recruiter message and see the evidence in seconds.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1013" },
  ],
};

// Runs before first paint so there's no flash of the wrong theme. "is:theme" holds a JSON string.
const themeScript = `(function(){try{var t=JSON.parse(localStorage.getItem("is:theme")||'"system"');var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-text">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
