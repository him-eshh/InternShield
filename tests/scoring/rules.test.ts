// C2 scoring rules (research 01 > rules 1-7): backstop + score, end to end through score().
import { describe, expect, it } from "vitest";
import type { Report, Source } from "@/lib/types";
import { score } from "@/lib/scoring/score";
import { facts, input } from "./helpers";

const ZW = "​";
const ids = (r: Report) => r.flags.map((f) => f.id);
const criticals = (r: Report) => r.flags.filter((f) => f.critical).map((f) => f.id);
const run = (text: string, source: Source | null = null) => score(input({ text, source }));

describe("rule 1: reimbursement trap (equipment)", () => {
  it("does not let an AI-only critical label turn a greeting into a high-risk verdict", () => {
    const text = "Hello candidate. Let's talk about the role.";
    const report = score(input({ text, facts: facts({ asks: [{ kind: "pay_fee", quote: "Hello candidate" }] }) }));
    expect(criticals(report)).toEqual([]);
    expect(report.level).toBe("low");
  });
  it("'buy it, we'll reimburse you' keeps buy_equipment critical", () => {
    const r = run("Congrats on the offer. Please buy a MacBook laptop through our approved vendor and we'll reimburse the full cost with your first paycheck.");
    expect(criticals(r)).toContain("buy_equipment");
    expect(r.level).toBe("high");
    expect(r.score).toBeGreaterThanOrEqual(85);
  });

  it("'purchase your own computer, you will be reimbursed' stays critical", () => {
    const r = run("To begin you must purchase a computer from the vendor below, you will be reimbursed after day one.");
    expect(criticals(r)).toContain("buy_equipment");
    expect(r.level).toBe("high");
  });

  it("'we'll ship it at no cost' cancels the equipment flag", () => {
    const r = run("You need to buy a laptop for the role, but we'll ship it at no cost.");
    expect(ids(r)).not.toContain("buy_equipment");
    expect(r.level).toBe("low");
  });

  it("a company-provided laptop (near-miss) raises nothing", () => {
    const r = run("Your laptop is company-provided and we'll ship it to your address before your first day. Nothing to buy.");
    expect(criticals(r)).toEqual([]);
    expect(ids(r)).not.toContain("buy_equipment");
    expect(r.level).toBe("low");
  });
});

describe("rule 2: money flowing the wrong way", () => {
  it("send the remaining balance onward by Cash App is critical", () => {
    const r = run("Once the client payment lands in your account, transfer the remaining balance to our supplier through Cash App.");
    expect(criticals(r)).toContain("money_wrong_way");
    expect(r.level).toBe("high");
  });

  it("'Zelle the balance' to the company is critical", () => {
    const r = run("After you receive the client funds, Zelle the balance to our supplier and keep the rest as your pay.");
    expect(r.flags.some((f) => f.critical && ["money_wrong_way", "deposit_check"].includes(f.id))).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(85);
  });

  it("mobile deposit without an onward payment is not critical", () => {
    const r = run("We will send your equipment budget, and you can use mobile deposit to put it in your account.");
    expect(criticals(r)).not.toContain("money_wrong_way");
    expect(criticals(r)).not.toContain("deposit_check");
  });

  it("'use your personal bank account' to receive payments is critical", () => {
    const r = run("You will use your personal bank account to receive customer payments for us.");
    expect(criticals(r)).toContain("money_wrong_way");
    expect(r.level).toBe("high");
  });

  it("a tax or fee to withdraw earnings is critical", () => {
    const r = run("Your earnings are ready. You must pay the tax before you can withdraw them from your account.");
    expect(criticals(r)).toContain("money_wrong_way");
    expect(r.level).toBe("high");
  });

  it("a negative balance is critical", () => {
    const r = run("Your account shows a negative balance, so top up to keep working on your next set.");
    expect(criticals(r)).toContain("money_wrong_way");
  });

  it("paying the rest by gift card, Bitcoin or wire is critical", () => {
    for (const method of ["gift card", "Bitcoin", "wire transfer"]) {
      const r = run(`Please wire the leftover funds to our vendor by ${method}.`);
      expect(r.flags.some((f) => f.critical), method).toBe(true);
      expect(r.level, method).toBe("high");
    }
  });

  it("'we pay you by direct deposit' (near-miss) raises nothing", () => {
    const r = run("Interns are paid every two weeks by direct deposit. You will set up payroll in our Workday portal on day one.");
    expect(criticals(r)).toEqual([]);
    expect(ids(r)).not.toContain("money_wrong_way");
    expect(r.level).toBe("low");
  });

  it("'use your personal bank account for direct deposit setup' (near-miss) raises nothing", () => {
    const r = run("On day one, use your personal bank account for direct deposit setup in the Workday portal.");
    expect(ids(r)).not.toContain("money_wrong_way");
  });

  it("the employer sending money to you is not wrong-way", () => {
    const r = run("We will send the remaining stipend to you by direct deposit on the 15th.");
    expect(ids(r)).not.toContain("money_wrong_way");
  });
});

describe("rule 3: running code and installing software", () => {
  it("installing AnyDesk is critical even when you applied first", () => {
    const r = run("Thanks for applying. Please install AnyDesk so our IT team can set up your workstation.", "company_site");
    const f = r.flags.find((x) => x.id === "run_code_or_install");
    expect(f?.critical).toBe(true);
    expect(f?.points).toBe(40);
    expect(r.level).toBe("high");
  });

  it("TeamViewer with your ID is critical", () => {
    const r = run("Download TeamViewer and send us your ID so we can finish your onboarding.", "handshake");
    expect(criticals(r)).toContain("run_code_or_install");
  });

  it("a 'Zoom update' installer from a non-Zoom link is critical", () => {
    const r = run("Your interview is on Zoom. Update Zoom first: https://zoom-update.example/get", "company_site");
    expect(criticals(r)).toContain("run_code_or_install");
  });

  it("pasting a command into the terminal to 'fix your camera' is critical", () => {
    const r = run("If your camera does not work, fix your camera driver: paste this command into Terminal and press enter.", "company_site");
    expect(criticals(r)).toContain("run_code_or_install");
    expect(r.level).toBe("high");
  });

  it("disabling antivirus is critical", () => {
    const r = run("Please disable your antivirus before you open the test, it blocks our tool.", "company_site");
    expect(criticals(r)).toContain("run_code_or_install");
  });

  it("git clone from an unsolicited 'came across your GitHub' message is critical", () => {
    const r = run("I came across your GitHub profile and love your projects. Please git clone our repo and run npm start.", "linkedin");
    expect(criticals(r)).toContain("run_code_or_install");
  });

  it("npm install with crypto talk is critical, even after applying", () => {
    const r = run("Thanks for applying. Clone the repo and run npm install for our DeFi wallet assessment.", "company_site");
    expect(criticals(r)).toContain("run_code_or_install");
  });

  it("git clone sent from a free email address is critical", () => {
    const r = score(
      input({
        text: "Thanks for applying to Acme Robotics. Please git clone the repo and finish the exercise. Dana, dana.recruiter@gmail.com",
        source: "company_site",
        facts: facts({ company: { value: "Acme Robotics", quote: "applying to Acme Robotics" }, sender: { name: "Dana", email: "dana.recruiter@gmail.com", phone: null } }),
      }),
    );
    expect(criticals(r)).toContain("run_code_or_install");
  });

  it("git clone to run an off-platform (Telegram) assessment is critical", () => {
    const r = run("Please npm install the assessment project, I'll send details on Telegram.", "company_site");
    expect(criticals(r)).toContain("run_code_or_install");
  });

  it("a plain git clone take-home after applying is untrusted_code (+15), not critical", () => {
    const r = run(
      "Thanks for applying to the Backend Intern role at Acme Robotics. For the next step please git clone the repo at github.com/acmerobotics/take-home and complete the exercise in 3 days. Questions? Reply here.",
      "company_site",
    );
    const f = r.flags.find((x) => x.id === "untrusted_code");
    expect(f?.points).toBe(15);
    expect(f?.critical).toBe(false);
    expect(ids(r)).not.toContain("run_code_or_install");
    expect(criticals(r)).toEqual([]);
    expect(r.level).toBe("low");
  });

  it("the same take-home from a Handshake application is also +15", () => {
    const r = run("Thanks for applying. Please run npm install in the starter project and complete the exercise by Friday.", "handshake");
    expect(r.flags.find((x) => x.id === "untrusted_code")?.points).toBe(15);
    expect(criticals(r)).toEqual([]);
  });

  it("updating Zoom from zoom.us itself (near-miss) is not flagged", () => {
    const r = run("Our call is on Zoom. If it asks, update Zoom from https://zoom.us/download before we talk.", "company_site");
    expect(criticals(r)).toEqual([]);
    expect(ids(r)).not.toContain("run_code_or_install");
  });
});

describe("rule 4: Unicode tricks, end to end", () => {
  it("zero-width characters inside 'W h a t s A p p' still flag off_platform and hidden_characters; quotes are raw substrings", () => {
    const raw = `Hello! Message our manager on W${ZW} h a${ZW} t s A${ZW} p p to continue. A one-time registration fee of $60 is required to secure your spot.`;
    const r = run(raw);
    expect(ids(r)).toContain("off_platform");
    expect(ids(r)).toContain("hidden_characters");
    const off = r.flags.find((f) => f.id === "off_platform");
    expect(off?.title).toContain("WhatsApp");
    expect(r.flags.find((f) => f.id === "hidden_characters")?.quote).toBeNull();
    for (const f of r.flags) if (f.quote) expect(raw.includes(f.quote), `${f.id}: ${f.quote}`).toBe(true);
    expect(r.level).toBe("high");
  });
});

describe("rule 5: task-scam vocabulary", () => {
  it("two or more terms add field_pattern +40 (not critical)", () => {
    const r = run("Your job is to like and subscribe to partner videos and finish 2 sets of 30 tasks every day for commission.");
    const f = r.flags.find((x) => x.id === "field_pattern");
    expect(f?.points).toBe(40);
    expect(f?.critical).toBe(false);
    expect(criticals(r)).toEqual([]);
  });

  it("rating apps plus boosting products counts, with no crypto words", () => {
    const r = run("Rate apps and boost product rankings for our clients, then complete 40 tasks a day.");
    expect(r.flags.find((x) => x.id === "field_pattern")?.points).toBe(40);
    expect(ids(r)).not.toContain("crypto_or_task_deposit");
  });

  it("a coach plus commission per task counts", () => {
    const r = run("Earn commission per task. Your personal coach will guide you through the first week.");
    expect(r.flags.find((x) => x.id === "field_pattern")?.points).toBe(40);
  });

  it("'follow our page' alone raises no task flag", () => {
    const r = run("Thanks for applying. Please follow our page on LinkedIn to see openings and company news.");
    expect(ids(r)).not.toContain("field_pattern");
  });

  it("a single term such as 'your mentor' raises no task flag", () => {
    const r = run("On day one you will meet your mentor, and your manager will walk you through the team calendar.");
    expect(ids(r)).not.toContain("field_pattern");
  });

  it("one phrase that fits two patterns counts once", () => {
    const r = run("We would also like you to like and subscribe to partner videos, as a thank you.");
    expect(ids(r)).not.toContain("field_pattern");
  });
});

describe("rule 6: every red flag carries severity, action and learnMore", () => {
  const loud =
    "Congrats, you are hired without an interview! Mail you a cashier's check for $2,400, deposit the check. Add our manager on WhatsApp now. Reply YES within 12 hours. Dear candidate, send your SSN to hr@gmail.com.";
  const check = (r: Report) => {
    const reds = r.flags.filter((f) => f.kind === "red");
    expect(reds.length).toBeGreaterThan(0);
    for (const f of reds) {
      expect(f.severity, f.id).toBeDefined();
      expect(f.action && f.action.length > 10, `${f.id} action`).toBe(true);
      expect(f.learnMore?.label, `${f.id} label`).toBeTruthy();
      expect(f.learnMore?.url.startsWith("https://"), `${f.id} url`).toBe(true);
    }
    for (const f of reds.filter((x) => x.critical)) expect(f.severity, f.id).toBe("critical");
  };

  it("a high report", () => {
    const r = run(loud);
    expect(r.level).toBe("high");
    check(r);
  });

  it("a medium report", () => {
    const r = run("Hello Dear candidate, we found your resume. Please reply on Telegram and we can talk about the remote role we have open for students.", "text_whatsapp");
    expect(r.level).not.toBe("low");
    check(r);
  });

  it("generated flags (other concerns, hidden characters) get the fallback info too", () => {
    const f = facts({ otherConcerns: [{ text: "Odd request", quote: "bring a friend" }] });
    const r = score(input({ text: `Please bring a friend to your${ZW} first${ZW} day${ZW} at the office, thanks.`, facts: f }));
    check(r);
  });
});

describe("rule 7: how sure", () => {
  it("a critical flag makes confidence high on its own", () => {
    const r = run("Please buy two gift cards and send the codes.");
    expect(r.confidence).toBeDefined();
    expect(r.confidence?.level).toBe("high");
    expect(r.confidence?.checked).toBeLessThanOrEqual(r.confidence?.total ?? 0);
  });

  it("critical wins even over a thin message", () => {
    const r = run("Buy gift cards.");
    expect(r.thinMessage).toBe(true);
    expect(r.confidence?.level).toBe("high");
  });

  it("a thin message with nothing critical is low", () => {
    const r = run("Hi, remote job, DM me.");
    expect(r.thinMessage).toBe(true);
    expect(criticals(r)).toEqual([]);
    expect(r.confidence?.level).toBe("low");
  });

  it("a normal message with no checks run is not 'high'", () => {
    const r = run(
      "Hi Taylor, thank you for applying to the Data Science Intern role at Harborview Analytics. We would like to invite you to a forty-five minute interview with two of our data scientists next week, through the candidate portal.",
    );
    expect(r.thinMessage).toBe(false);
    expect(r.confidence).toBeDefined();
    expect(r.confidence?.level).not.toBe("high");
    expect(r.confidence?.total).toBeGreaterThan(0);
  });
});
