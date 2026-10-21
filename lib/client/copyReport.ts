// Plain-text report for sharing with a career center (spec.md > Scam Outcome).
import { LEVEL_LABELS, type Report } from "../types";

export const FTC_URL = "https://reportfraud.ftc.gov";
export const IC3_URL = "https://www.ic3.gov";

export function buildReportText(report: Report, careersUrl?: string | null): string {
  const lines: string[] = [
    "InternShield report",
    `${LEVEL_LABELS[report.level]} (risk ${report.score} out of 100)`,
    "",
  ];
  if (report.flags.length) {
    lines.push("What we found:");
    for (const f of report.flags) {
      lines.push(`- ${f.kind === "red" ? "Red flag" : "Good sign"}: ${f.title}`);
      if (f.quote) lines.push(`  Quote: "${f.quote}"`);
      lines.push(`  Why it matters: ${f.why}`);
      if (f.sourceUrl) lines.push(`  Source: ${f.sourceUrl}`);
    }
    lines.push("");
  }
  if (report.couldntCheck.length) {
    lines.push("Couldn't check:");
    for (const c of report.couldntCheck) lines.push(`- ${c.check}: ${c.reason}`);
    lines.push("");
  }
  lines.push(`${report.coverage.ran} of ${report.coverage.total} checks ran.`, "");
  lines.push(`Report fraud (FTC): ${FTC_URL}`, `FBI Internet Crime Complaint Center: ${IC3_URL}`);
  if (careersUrl) lines.push(`Official careers page: ${careersUrl}`);
  return lines.join("\n");
}

export async function copyReport(report: Report, careersUrl?: string | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildReportText(report, careersUrl));
    return true;
  } catch {
    return false;
  }
}
