import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f7faff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 48 48" width={28} height={28} fill="none">
          <circle cx="24" cy="20" r="14" fill="#e8b94c" opacity="0.3" />
          <circle cx="24" cy="20" r="8" fill="#e8b94c" />
          <path d="M2 44 L13 30 L19 35 L24 23 L29 35 L35 30 L46 44 Z" fill="#3a3a4a" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
