import { ImageResponse } from "next/og";
import { RingMark } from "@/components/Logo";

export const alt = "InternShield: is this offer real?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 48,
          }}
        >
          <RingMark size={200} color="#2F6FD6" />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 96,
                fontWeight: 700,
                color: "#1D1D1F",
              }}
            >
              InternShield
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 48,
                color: "#6E6E73",
              }}
            >
              Is this offer real?
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
