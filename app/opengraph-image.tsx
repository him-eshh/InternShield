import { ImageResponse } from "next/og";

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
          <svg width="200" height="200" viewBox="0 0 24 24">
            <path
              fill="#2F6FD6"
              d="M12 2 L20 5 V11 C20 16 16.5 20.5 12 22 C7.5 20.5 4 16 4 11 V5 Z"
            />
          </svg>
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
