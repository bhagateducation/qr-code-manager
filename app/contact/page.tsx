import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { CONTACT_EMAIL, CONTACT_URL } from "@/lib/public-discovery";

export const metadata: Metadata = { title: "Contact", description: `Contact ${BRAND} support.`, alternates: { canonical: "/contact" }, robots: { index: true, follow: true } };

export default function Contact() {
  return (
    <main className="wrap site-section">
      <h1>Contact {BRAND}</h1>
      <p>For help with the QR Manager app, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      <p><a href={CONTACT_URL}>Bhagat Education contact page</a> · <a href="/">Back to {BRAND}</a></p>
    </main>
  );
}
