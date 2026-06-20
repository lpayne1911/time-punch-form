import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// App icon — Velvet "V." wordmark on the brand gradient.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2a1d33, #100b16 70%)",
          color: "#f2eef7",
          fontSize: 320,
          fontWeight: 600,
          fontFamily: "serif",
          letterSpacing: "-0.04em",
        }}
      >
        V<span style={{ color: "#c98bab" }}>.</span>
      </div>
    ),
    { ...size },
  );
}
