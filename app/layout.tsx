import type { Metadata, Viewport } from "next";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "./app.css";
import { BRAND } from "@/lib/brand";
import { getSiteOrigin } from "@/lib/site-origin";

export const metadata: Metadata = {
  metadataBase: getSiteOrigin(),
  robots: { index: false, follow: true },
  title: { default: `${BRAND} — Free Link, Text, Wi-Fi, Image & Book QR Codes`, template: `%s | ${BRAND}` },
  description:
    "Create dynamic QR codes, manage structured business records, and measure scan activity in one workspace.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Runs before first paint so a saved theme never flashes the default one. Light is the default; dark is opt-in.
const themeScript = `try{var d=document.documentElement,s=localStorage;d.dataset.theme=s.getItem("qrm-theme")||"violet";d.dataset.mode=s.getItem("qrm-mode")||"light"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
