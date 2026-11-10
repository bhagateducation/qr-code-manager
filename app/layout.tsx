import type { Metadata, Viewport } from "next";
import "./app.css";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: `${BRAND} — Dynamic QR codes for your business`, template: `%s | ${BRAND}` },
  description:
    "Create dynamic QR codes, manage structured business records, and measure scan activity in one workspace.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Runs before first paint so a saved theme never flashes the default one.
const themeScript = `try{var d=document.documentElement,s=localStorage;d.dataset.theme=s.getItem("qrm-theme")||"violet";d.dataset.mode=s.getItem("qrm-mode")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch(e){}`;

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
