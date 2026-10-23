import { ImageResponse } from "next/og";
import { RingMark } from "@/components/Logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// ponytail: generated at build time instead of a checked-in apple-icon.png; same mark, no image tooling.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#2F6FD6" }}>
        <RingMark size={128} color="#FFFFFF" />
      </div>
    ),
    { ...size },
  );
}
