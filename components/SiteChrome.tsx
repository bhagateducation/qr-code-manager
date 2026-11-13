import Link from "next/link";
import { QrCode } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { Site } from "@/lib/site";
import { CONTACT_EMAIL } from "@/lib/public-discovery";
import ScrollReveal from "@/components/ScrollReveal";

/** Header shared by the public pages. On sub-pages the section links point back to the home page. */
export function SiteHeader({ show, home = false }: { show: Site["show"]; home?: boolean }) {
  const base = home ? "" : "/";
  return (
    <>
      <ScrollReveal />
      <a href="#main-content" className="site-skip button primary">Skip to content</a>
      <header className="site-nav">
        <div>
          <Link href="/" className="brand">
            <span className="brand-mark">
              <QrCode size={18} />
            </span>
            {BRAND}
          </Link>
          <nav aria-label="Main">
            {show.features && <a href={`${base}#features`}>Features</a>}
            {show.steps && <a href={`${base}#how-it-works`}>How it works</a>}
            {show.pricing && <a href={`${base}#pricing`}>Pricing</a>}
            {show.faq && <a href={`${base}#faq`}>FAQ</a>}
            <Link href="/login" className="site-mobile-signin">Sign in</Link>
          </nav>
          <div className="row-actions" style={{ flexWrap: "nowrap" }}>
            <Link href="/login" className="button">Sign in</Link>
            <Link href="/register" className="button primary">Start free</Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} {BRAND}</span>
      <span className="row-actions">
        <Link href="/about">About</Link>
        <Link href="/contact">Contact</Link>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <Link href="/login">Sign in</Link>
        <Link href="/register">Create account</Link>
      </span>
    </footer>
  );
}
