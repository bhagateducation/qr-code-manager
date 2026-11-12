import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { COMPANY, COMPANY_URL, DESCRIPTION } from "@/lib/public-discovery";

export const metadata: Metadata = { title: "About", description: DESCRIPTION, alternates: { canonical: "/about" }, robots: { index: true, follow: true } };

export default function About() {
  return (
    <main className="wrap site-section">
      <h1>About {BRAND}</h1>
      <p>{DESCRIPTION}</p>
      <p>{BRAND} is operated by <a href={COMPANY_URL}>{COMPANY}</a>.</p>
      <p><a href="/contact">Contact support</a> · <a href="/">Back to {BRAND}</a></p>
    </main>
  );
}
