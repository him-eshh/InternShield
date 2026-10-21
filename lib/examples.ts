// "Try an example" messages + saved step results (spec.md > Example Snapshots).
// Both messages are made up. Neither is a real message anyone received.
import type { Source, Stage, StepResults } from "./types";

export interface Example {
  id: "scam" | "real";
  label: string;
  text: string;
  form: { sender: string; company: string };
  source: Source;
  stage: Stage;
  savedSteps: StepResults;
}

const SCAM_TEXT = `Hello,

My name is Sarah Mitchell, HR Coordinator at Brightline Data Solutions. We came across your resume on Handshake and we are pleased to offer you the remote position of Data Entry Assistant (Part-Time), paying $35/hour. No prior experience is needed and you will be hired directly without an interview.

Your duties will be simple tasks assigned weekly by your supervisor. To get started, we will mail you a check for $2,850 to purchase your work equipment (laptop and software) from our approved vendor. Once you deposit the check, send the remaining balance to the vendor and they will ship your equipment.

Please add our hiring manager on WhatsApp at +1 (213) 555-0147 to complete your onboarding. This offer is only available for the next 24 hours, so respond as soon as possible.

Best regards,
Sarah Mitchell
HR Coordinator, Brightline Data Solutions
brightline.datasolutions.hr@gmail.com`;

const REAL_TEXT = `Hi Alex,

Thanks for applying to the Software Engineering Intern (Summer 2027) role at Stripe through our careers site. I'm Jordan Lee from the University Recruiting team, and I'd love to set up a 30-minute introductory phone call to learn more about your interests and walk you through our interview process.

Could you share a few times that work for you next week? Once we connect, I'll send a calendar invite with the details. You can also find the full job description on our careers page.

Looking forward to chatting!

Jordan Lee
University Recruiting, Stripe
jordan.lee@stripe.com`;

export const EXAMPLES: Record<Example["id"], Example> = {
  scam: {
    id: "scam",
    label: "a scam",
    text: SCAM_TEXT,
    form: { sender: "brightline.datasolutions.hr@gmail.com", company: "Brightline Data Solutions" },
    source: "handshake",
    stage: "offer",
    savedSteps: {
      extract: {
        status: "done",
        data: {
          isJobMessage: true,
          company: { value: "Brightline Data Solutions", quote: "HR Coordinator at Brightline Data Solutions" },
          role: { value: "Data Entry Assistant (Part-Time)", quote: "remote position of Data Entry Assistant (Part-Time)" },
          pay: { value: "$35/hour", quote: "paying $35/hour" },
          sender: { name: "Sarah Mitchell", email: "brightline.datasolutions.hr@gmail.com", phone: "+1 (213) 555-0147" },
          asks: [
            { kind: "deposit_check", quote: "Once you deposit the check, send the remaining balance to the vendor" },
            { kind: "buy_equipment", quote: "we will mail you a check for $2,850 to purchase your work equipment" },
          ],
          offPlatform: { app: "WhatsApp", quote: "Please add our hiring manager on WhatsApp at +1 (213) 555-0147" },
          pressure: [{ quote: "This offer is only available for the next 24 hours" }],
          interview: { status: "none_hired_directly", quote: "you will be hired directly without an interview" },
          dutiesVague: { quote: "Your duties will be simple tasks assigned weekly by your supervisor" },
          noExperienceNeeded: { quote: "No prior experience is needed" },
          employerCountryHint: null,
          otherConcerns: [],
        },
      },
      company: { status: "done", data: null },
      sender: {
        status: "done",
        data: {
          email: "brightline.datasolutions.hr@gmail.com",
          domain: "gmail.com",
          freeEmail: true,
          registeredAt: null,
          hasMx: true,
          hunter: null,
        },
      },
      posting: { status: "skipped", reason: "needs step 2" },
    },
  },
  real: {
    id: "real",
    label: "a real one",
    text: REAL_TEXT,
    form: { sender: "jordan.lee@stripe.com", company: "Stripe" },
    source: "company_site",
    stage: "message",
    savedSteps: {
      extract: {
        status: "done",
        data: {
          isJobMessage: true,
          company: { value: "Stripe", quote: "role at Stripe through our careers site" },
          role: { value: "Software Engineering Intern (Summer 2027)", quote: "Software Engineering Intern (Summer 2027)" },
          pay: null,
          sender: { name: "Jordan Lee", email: "jordan.lee@stripe.com", phone: null },
          asks: [],
          offPlatform: null,
          pressure: [],
          interview: { status: "mentioned", quote: "walk you through our interview process" },
          dutiesVague: null,
          noExperienceNeeded: null,
          employerCountryHint: null,
          otherConcerns: [],
        },
      },
      company: { status: "done", data: { officialDomain: "stripe.com", careersUrl: "https://stripe.com/careers" } },
      sender: {
        status: "done",
        data: {
          email: "jordan.lee@stripe.com",
          domain: "stripe.com",
          freeEmail: false,
          registeredAt: "1995-09-12T04:00:00Z",
          hasMx: true,
          hunter: null,
        },
      },
      // Snapshot from the live run on Oct 21, 2026. Re-check the posting is still up before the demo.
      posting: {
        status: "done",
        data: {
          found: true,
          url: "https://stripe.com/careers/listing/software-engineer-intern/8031833",
          title: "Stripe Careers | Software Engineer, Intern",
          location: null,
          pay: null,
          postedDate: null,
          onOfficialDomain: true,
        },
      },
    },
  },
};
