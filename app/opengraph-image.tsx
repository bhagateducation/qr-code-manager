import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${BRAND} — Dynamic QR codes for your business`;

export default function SocialPreview() {
  return new ImageResponse(
    (
      <div style={{
        display: "flex", flexDirection: "column", justifyContent: "center",
        width: "100%", height: "100%", padding: 90, color: "#fff",
        background: "linear-gradient(125deg, #191333, #4e32c1)",
      }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#dfd5ff" }}>{BRAND}</div>
        <div style={{ display: "flex", fontSize: 82, fontWeight: 700, marginTop: 44 }}>Print once.</div>
        <div style={{ display: "flex", fontSize: 82, fontWeight: 700 }}>Update forever.</div>
        <div style={{ display: "flex", fontSize: 33, color: "#e7dfff", marginTop: 32 }}>
          Dynamic QR codes for your business
        </div>
      </div>
    ),
    size,
  );
}
