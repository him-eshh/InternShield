// Renders made-up chat/email screenshots to PNG (short, long/tall, multi-paragraph). Content is invented.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

export const SAMPLES = {
  short: ["Hi Sam, this is Dana from Northwind Analytics recruiting.", "Are you free Thursday at 2pm for a 20 minute call about the data intern role?"],
  multi: [
    "Hello Priya,",
    "Thank you for applying to the Marketing Intern position at Bluefin Outdoors. We reviewed your application and would like to invite you to a first interview.",
    "The interview is 30 minutes on video with our brand team. Please pick a time using the scheduling link in this email.",
    "If you have questions, reply to this message and I will get back to you within two business days.",
    "Best regards,\nMarcus Hale\nCampus Recruiting, Bluefin Outdoors",
  ],
  long: Array.from({ length: 34 }, (_, i) =>
    [
      `Message ${i + 1}: Quick update about the Quantum Peak Logistics remote assistant role.`,
      `We will send onboarding step ${i + 1} after you confirm your mailing address.`,
      `Reply with code QPL-${100 + i} so we know you read item ${i + 1}.`,
    ][i % 3],
  ),
};

function html(lines, phone) {
  const bubbles = lines.map((l) => `<div class="b">${l.replace(/\n/g, "<br>")}</div>`).join("");
  return `<html><body style="margin:0;font:16px -apple-system,Segoe UI,Arial;background:#f2f2f7;width:${phone ? 390 : 700}px">
<div style="padding:14px 16px;background:#fff;border-bottom:1px solid #ddd;font-weight:600">Recruiter · Messages</div>
<div style="padding:12px">${bubbles}</div>
<style>.b{background:#fff;border-radius:16px;padding:10px 14px;margin:8px 0;max-width:88%;line-height:1.4}</style></body></html>`;
}

export async function makeShots(dir = "qa/shots") {
  mkdirSync(dir, { recursive: true });
  const b = await chromium.launch();
  const out = {};
  for (const [k, lines] of Object.entries(SAMPLES)) {
    const p = await b.newPage({ viewport: { width: k === "long" ? 390 : 700, height: 400 }, deviceScaleFactor: 2 });
    await p.setContent(html(lines, k === "long"));
    out[k] = `${dir}/${k}.png`;
    await p.screenshot({ path: out[k], fullPage: true });
    await p.close();
  }
  await b.close();
  return out;
}

if (process.argv[1].endsWith("make-shots.mjs")) console.log(await makeShots());
