import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/roboto-slab/500.css";
import "@fontsource/roboto-slab/700.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "QR Manager — Every code. Every connection.",
  description:
    "Create dynamic QR codes, manage structured business records, and measure scan activity in one workspace.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-[#EEEAFE] selection:text-[#5B43D6]">
        {children}
      </body>
    </html>
  );
}
