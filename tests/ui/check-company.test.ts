// Bug D: company vs department (findings 05 Bug D, 02 §3.8). All messages are made up.
import { describe, expect, it } from "vitest";
import { autofill, stripDepartment } from "@/lib/autofill";

const CASES: [string, string, string | null][] = [
  ["department-only team, free mail", "Hi! I'm Jordan from the University Recruiting team. Can we chat?\njordan.r@gmail.com", null],
  ["department team + company in signature", "I'm Jordan Lee from the University Recruiting team.\n\nBest,\nJordan Lee\nUniversity Recruiting, Brightline Data", "Brightline Data"],
  ["company before department team", "Hello from the Globex Campus Hiring team! We'd like to talk.", "Globex"],
  ["on the X Recruiting team", "I'm on the Initech Recruiting team and saw your profile.", "Initech"],
  ["possessive", "Northwind Labs's talent team would love to meet you. Also see the University Recruiting team.", "Northwind Labs"],
  ["Talent Acquisition group only", "Our Talent Acquisition group would like to schedule a call with you.", null],
  ["People Team only", "Hi Alex, the People Team here. Please send your availability.", null],
  ["Human Resources only", "This is Human Resources. Please confirm your start date.", null],
  ["legal suffix in signature beats body", "We loved your resume.\n\nRegards,\nPriya Shah\nTalent Partner | Contoso Ltd", "Contoso Ltd"],
  ["at X with suffix", "I'm a recruiter at Fabrikam Technologies and we have an opening.", "Fabrikam Technologies"],
  ["email domain only", "Please reply to careers@tailspin.io with your resume.", "Tailspin"],
  ["domain matches body name", "I work at Wingtip Toys. Write back to dana@wingtiptoys.com", "Wingtip Toys"],
  ["X University is a company", "Thanks for applying to the research assistant role at Lakeside University.", "Lakeside University"],
  ["University Relations team", "Greetings from the University Relations team! Apply on our site.", null],
  ["platform name is never the company", "We found your resume on LinkedIn. Join WhatsApp to continue.", null],
  ["Early Careers dept + at company", "I lead Early Careers at Adatum Corporation and want to set up a call.", "Adatum Corporation"],
  ["staffing agency on behalf of", "I'm a recruiter at Proseware Staffing Partners, reaching out on behalf of a client.", "Proseware Staffing Partners"],
  ["HR line then company", "Kind regards,\nSam Ortiz\nHR, Litware Inc.", "Litware Inc"],
  ["two companies, same weight: empty", "I left a job at Alpha and now work with friends; join Beta today.", null],
  ["free mail + named company in signature", "Thanks,\nMia Chen\nRecruiting Coordinator, Brightline Data Solutions\nmia.brightline@gmail.com", "Brightline Data Solutions"],
  ["scam look-alike domain still yields the body company", "Recruiter at Amazon here.\nEmail: hr@amazon-careers-hr.net", "Amazon"],
];

describe("company vs department", () => {
  it.each(CASES)("%s", (_name, text, want) => {
    expect(autofill(text).company).toBe(want);
  });

  it("strips department words but keeps real names", () => {
    expect(stripDepartment("Initech Recruiting")).toBe("Initech");
    expect(stripDepartment("the Talent Acquisition group")).toBe("");
    expect(stripDepartment("Stanford University")).toBe("Stanford University");
    expect(stripDepartment("Goldman Group")).toBe("Goldman Group");
  });
});
