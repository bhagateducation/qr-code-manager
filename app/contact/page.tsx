import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, Mail, MapPin, MessageCircleQuestion, Phone } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { getSite } from "@/lib/site";
import { CONTACT_EMAIL } from "@/lib/public-discovery";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Contact", description: `Contact ${BRAND} support.`, alternates: { canonical: "/contact" }, robots: { index: true, follow: true } };

const tone = (value: string) => ({ "--tone": value }) as React.CSSProperties;

export default async function Contact() {
  const site = await getSite();
  const telephone = process.env.PUBLIC_BUSINESS_PHONE?.trim();
  const address = process.env.PUBLIC_BUSINESS_ADDRESS?.trim();
  return (
    <div className="site">
      <SiteHeader show={site.show} />
      <main id="main-content" className="wrap" tabIndex={-1}>
        <section className="page-hero">
          <span className="eyebrow">Contact</span>
          <h1 className="display">
            We are here to <span>help</span>
          </h1>
          <p>Questions about your account, codes or plans? Reach us below.</p>
        </section>
        <section className="info-grid" aria-label="Ways to reach us">
          <article className="info-card">
            <span className="page-icon" style={tone("var(--c-blue)")}>
              <Mail size={20} />
            </span>
            <h2>Email support</h2>
            <p>Write to us for help with {BRAND}.</p>
            <a className="button primary" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </article>
          {telephone && (
            <article className="info-card">
              <span className="page-icon" style={tone("var(--c-green)")}>
                <Phone size={20} />
              </span>
              <h2>Phone</h2>
              <p>Call us during business hours.</p>
              <a className="button" href={`tel:${telephone.replace(/[^+\d]/g, "")}`}>
                {telephone}
              </a>
            </article>
          )}
          {address && (
            <article className="info-card">
              <span className="page-icon" style={tone("var(--c-amber)")}>
                <MapPin size={20} />
              </span>
              <h2>Address</h2>
              <address>{address}</address>
            </article>
          )}
          <article className="info-card">
            <span className="page-icon" style={tone("var(--c-violet)")}>
              <KeyRound size={20} />
            </span>
            <h2>Can&apos;t sign in?</h2>
            <p>Reset your password with the email on your account.</p>
            <Link className="button" href="/forgot-password">
              Reset password
            </Link>
          </article>
          {site.show.faq && (
            <article className="info-card">
              <span className="page-icon" style={tone("var(--c-teal)")}>
                <MessageCircleQuestion size={20} />
              </span>
              <h2>Common questions</h2>
              <p>Plans, domains and renewals are answered in our FAQ.</p>
              <Link className="button" href="/#faq">
                Read the FAQ
              </Link>
            </article>
          )}
        </section>
        <SiteFooter />
      </main>
    </div>
  );
}
