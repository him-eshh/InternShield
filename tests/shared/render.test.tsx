// UI render tests use react-dom/server (no DOM library installed).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Logo from "@/components/Logo";

describe("tsx render", () => {
  it("renders a component to markup", () => {
    expect(renderToStaticMarkup(<Logo />)).toContain("InternShield");
  });
});
