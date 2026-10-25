import { ImageResponse } from "next/og";
import { RingMark } from "@/components/Logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// ponytail: generated at build time instead of a checked-in apple-icon.png; same mark, no image tooling.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#FBF8F3" }}>
        <RingMark size={128} color="#1e2a47" tri={["#ea5a31", "#0d7d74", "#6b4eff"]} />
      </div>
    ),
    { ...size },
  );
}
