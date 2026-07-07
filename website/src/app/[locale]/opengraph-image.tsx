import { ImageResponse } from "next/og";

export const alt = "form-human-guard — a lightweight pre-submit direction matching guard for forms";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Single dark-theme OG image with the arrow motif (see §9 of the brief). */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #05070f 0%, #0c1126 100%)",
          color: "#e6e9fb",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="96" height="96" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14.5" stroke="#818cf8" strokeOpacity="0.45" strokeWidth="1.5" />
            <path
              d="M11.5 20.5 20 12m0 0h-6.2M20 12v6.2"
              stroke="#818cf8"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700 }}>form-human-guard</div>
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 40, lineHeight: 1.3, maxWidth: 900 }}>
          A lightweight pre-submit direction matching guard for forms.
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 24, color: "#8e96bb" }}>
          One-time HMAC tokens · server-side timing · explainable risk scoring · MIT
        </div>
      </div>
    ),
    size
  );
}
