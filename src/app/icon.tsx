import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "linear-gradient(135deg, #6C5CE7, #a29bfe)",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
          fontSize: 100,
          fontWeight: 900,
          color: "white",
        }}
      >
        算
      </div>
    ),
    { ...size }
  );
}
