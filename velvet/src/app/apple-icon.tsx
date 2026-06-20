import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Apple touch icon — what iOS uses for "Add to Home Screen".
export default function AppleIcon() {
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
          fontSize: 112,
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
