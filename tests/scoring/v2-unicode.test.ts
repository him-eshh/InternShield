import { describe, expect, it } from "vitest";
import { originalQuote, quoteIsReal, visibleQuote } from "@/lib/quotes";
import { backstop } from "@/lib/scoring/backstop";
import { score } from "@/lib/scoring/score";
import { cleanText } from "@/lib/scoring/unicode";
import { facts, input } from "./helpers";

const ZW = "​";

describe("cleanText", () => {
  it("leaves ordinary text alone, with an identity map", () => {
    const raw = "Hi Sam, thanks for applying to Acme!\nU.S. based, e.g. Boston. I have a plan.";
    const c = cleanText(raw);
    expect(c.text).toBe(raw);
    expect(c.map).toEqual(Array.from(raw, (_, i) => i));
    expect(c.stripped).toBe(0);
    expect(c.replaced).toBe(0);
  });

  it("strips zero-width, bidi and tag characters and counts them", () => {
    const raw = `Tele${ZW}gram ‮evil‬ \u{E0041}\u{E0042}ok`;
    const c = cleanText(raw);
    expect(c.text).toBe("Telegram evil ok");
    expect(c.stripped).toBe(5);
    expect(c.map).toHaveLength(c.text.length);
    expect(raw[c.map[c.text.indexOf("g")]]).toBe("g");
    expect(c.map[c.text.indexOf("g")]).toBe(5);
  });

  it("doesn't count emoji joiners as hidden characters", () => {
    const c = cleanText("Team \u{1F468}‍\u{1F469}‍\u{1F467} says hi ❤️");
    expect(c.stripped).toBe(0);
  });

  it("applies NFKC (full-width letters, ligatures)", () => {
    expect(cleanText("ＷhatsApp ﬁle").text).toBe("WhatsApp file");
  });

  it("maps look-alike Cyrillic and Greek letters inside Latin words", () => {
    const c = cleanText("Your pаyment via Tеlegrаm");
    expect(c.text).toBe("Your payment via Telegram");
    expect(c.replaced).toBe(3);
  });

  it("leaves genuinely Russian or Greek words alone", () => {
    const raw = "Привет, γεια σου";
    expect(cleanText(raw).text).toBe(raw);
  });

  it("collapses letter-spacing tricks", () => {
    expect(cleanText("add us on W h a t s A p p now").text).toBe("add us on WhatsApp now");
    expect(cleanText("send 50 U S D T").text).toBe("send 50 USDT");
    expect(cleanText("p a y   n o w").text).toBe("pay   now");
    expect(cleanText("p.a.y first").text).toBe("pay first");
  });

  it("collapsing keeps a map back to the spaced original", () => {
    const raw = "on W h a t s A p p";
    const c = cleanText(raw);
    expect(c.text).toBe("on WhatsApp");
    expect(c.map[c.text.indexOf("W")]).toBe(3);
    expect(c.map[c.text.length - 1]).toBe(raw.length - 1);
  });

  it("doesn't touch emails, initials or two-letter spacing", () => {
    for (const s of ["write to a.b.c@mail.example", "Dr. J. R. Smith", "Plan A or B", "see x.y.z.example.com"]) {
      expect(cleanText(s).text).toBe(s);
    }
  });
});

describe("quotes tolerate Unicode tricks", () => {
  const raw = `Please buy two g${ZW}i${ZW}f${ZW}t c${ZW}ards for the kit.`;

  it("a quote read from the cleaned text still verifies against the original", () => {
    expect(quoteIsReal("buy two gift cards for the kit", raw)).toBe(true);
    expect(quoteIsReal("buy two gift vouchers", raw)).toBe(false);
  });

  it("originalQuote returns the user's own wording, hidden characters included", () => {
    expect(originalQuote("buy two gift cards", raw)).toBe(`buy two g${ZW}i${ZW}f${ZW}t c${ZW}ards`);
    expect(originalQuote("not in the message", raw)).toBeNull();
  });

  it("visibleQuote keeps plain-text quotes exactly as given", () => {
    expect(visibleQuote("Thanks for applying", "Hi Sam. Thanks for applying to Acme.")).toBe("Thanks for applying");
    expect(visibleQuote(null, "x")).toBeNull();
  });

  it("maps a spaced-out quote back to the spaced original", () => {
    const text = "Message us on W h a t s A p p today.";
    expect(quoteIsReal("message us on whatsapp", text)).toBe(true);
    expect(originalQuote("on WhatsApp", text)).toBe("on W h a t s A p p");
  });

  it("existing behavior: curly quotes, case and spacing still match; short or long quotes don't", () => {
    expect(quoteIsReal("it’s  OK", "Yes it's ok today")).toBe(true);
    expect(quoteIsReal("ab", "ab cd")).toBe(false);
    expect(quoteIsReal("x".repeat(201), "x".repeat(300))).toBe(false);
  });
});

describe("Unicode tricks can't hide a warning sign", () => {
  it("the backstop reads the cleaned text through score()", () => {
    const text = `Please buy two g${ZW}i${ZW}f${ZW}t c${ZW}ards for the kit and send the codes.`;
    expect(backstop(text).map((h) => h.id)).not.toContain("gift_cards");
    const r = score(input({ text }));
    const flag = r.flags.find((f) => f.id === "gift_cards");
    expect(flag?.critical).toBe(true);
    expect(flag?.quote && text.includes(flag.quote)).toBe(true);
    expect(r.level).toBe("high");
  });

  it("3+ stripped characters add hidden_characters (+10); 2 do not", () => {
    const base = "Hi, this is Sam from Acme with a short note about your application and the next steps in the process.";
    const two = score(input({ text: base.replace("Sam", `S${ZW}a${ZW}m`) }));
    expect(two.flags.map((f) => f.id)).not.toContain("hidden_characters");
    const three = score(input({ text: base.replace("Sam", `S${ZW}a${ZW}m${ZW}`) }));
    const flag = three.flags.find((f) => f.id === "hidden_characters");
    expect(flag?.points).toBe(10);
    expect(flag?.critical).toBe(false);
    expect(flag?.quote).toBeNull();
  });

  it("look-alike letters count toward the hidden-characters flag too", () => {
    const text = "Chat on Tеlеgrаm, we pay in cаsh. Hi there, short note about the internship role and its tasks.";
    const r = score(input({ text }));
    expect(r.flags.map((f) => f.id)).toContain("hidden_characters");
    expect(r.flags.map((f) => f.id)).toContain("off_platform");
  });

  it("inserting 1, 3 and 10 invisible characters never lowers a high case", () => {
    const base = "We will mail you a check for $2,400. Deposit the check and send the rest to our vendor. Add our manager on WhatsApp.";
    const expected = score(input({ text: base }));
    for (const n of [1, 3, 10]) {
      let text = base;
      for (let i = 0; i < n; i++) text = text.replace(/(?<=[A-Za-z]{2})(?=[A-Za-z]{2})/, ZW);
      const r = score(input({ text }));
      expect(r.level, `${n} characters`).toBe("high");
      expect(r.flags.some((f) => f.id === "deposit_check" && f.critical)).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(expected.score);
    }
  });

  it("spaced-out app names still count as off-platform", () => {
    const r = score(input({ text: "Let's continue on W h a t s A p p, I will send details there. Hi from the Acme hiring team." }));
    expect(r.flags.map((f) => f.id)).toContain("off_platform");
  });

  it("AI facts quoted from the cleaned text are still accepted", () => {
    const text = `Add our manager on Whats${ZW}App to continue with your onboarding at Acme Corp.`;
    const f = facts({ offPlatform: { app: "WhatsApp", quote: "Add our manager on WhatsApp to continue" } });
    const r = score(input({ text, facts: f }));
    const flag = r.flags.find((x) => x.id === "off_platform");
    expect(flag?.quote).toBe(`Add our manager on Whats${ZW}App to continue`);
  });
});
