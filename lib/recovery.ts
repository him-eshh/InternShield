// "Already sent money or shared info?" steps, ordered by time-sensitivity (findings 02 §3.6, FTC order).
// Shown at medium/high only; never changes the score. URLs are the ones Research checked.
import type { RiskLevel } from "@/lib/types";

export interface RecoveryStep {
  id: string;
  title: string;
  body: string;
  link?: { label: string; url: string };
}

export const RECOVERY_INTRO = "There's no shame in it. Act on these in order.";

export const RECOVERY_STEPS: RecoveryStep[] = [
  { id: "stop", title: "Stop paying and replying", body: "They'll keep asking for more until you stop." },
  {
    id: "paid",
    title: "Sent money? Call your bank or payment app now",
    body: "Ask them to reverse it. For gift cards, keep the card and receipt and call the card company.",
    link: { label: "FTC: if you paid a scammer", url: "https://consumer.ftc.gov/articles/what-do-if-you-were-scammed" },
  },
  {
    id: "check",
    title: "Deposited a check? Don't spend or send any of it",
    body: "Tell your bank now. A fake check can bounce days later and the bank takes the money back.",
    link: { label: "FTC: fake checks", url: "https://consumer.ftc.gov/articles/how-spot-avoid-and-report-fake-check-scams" },
  },
  {
    id: "ssn",
    title: "Shared your SSN? Freeze your credit",
    body: "Freezes at all 3 bureaus are free. If it was used, get a recovery plan.",
    link: { label: "IdentityTheft.gov", url: "https://www.identitytheft.gov/" },
  },
  {
    id: "passwords",
    title: "Shared a login or installed something? Change passwords",
    body: "Use a different device, turn on 2FA, and run security software on the one you installed it on.",
  },
  {
    id: "report",
    title: "Report it",
    body: "Report it even if you're not sure. Tell your career center and the site they contacted you on.",
    link: { label: "ReportFraud.ftc.gov", url: "https://reportfraud.ftc.gov/" },
  },
  {
    id: "recovery-scams",
    title: "Never pay a \"recovery\" service",
    body: "People who promise to get your money back for a fee are a second scam.",
    link: { label: "FBI IC3", url: "https://www.ic3.gov/" },
  },
];

export function showRecovery(level: RiskLevel): boolean {
  return level === "medium" || level === "high";
}
