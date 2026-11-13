import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, QrCode, ShieldCheck, Users } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { getSite } from "@/lib/site";
import { COMPANY, COMPANY_URL, DESCRIPTION } from "@/lib/public-discovery";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "About", description: DESCRIPTION, alternates: { canonical: "/about" }, robots: { index: true, follow: true } };

const tone = (value: string) => ({ "--tone": value }) as React.CSSProperties;
const points = [
  { icon: QrCode, tone: "var(--c-blue)", title: "Codes that stay useful", text: "Print a code once and change where it goes whenever your menu, offer or website changes." },
  { icon: BarChart3, tone: "var(--c-green)", title: "Clear scan numbers", text: "See scans by day, hour and device for every code, and export them to CSV." },
  { icon: Users, tone: "var(--c-sky)", title: "Made for teams", text: "Invite people as admin, editor or viewer. Every change is written to an audit log." },
  { icon: ShieldCheck, tone: "var(--c-violet)", title: "Safe by default", text: "Two-step sign-in, separate workspaces and a 30-day trash for deleted codes." },
];

export default async function About() {
  const site = await getSite();
  return (
    <div className="site">
      <SiteHeader show={site.show} />
      <main id="main-content" className="wrap" tabIndex={-1}>
        <section className="page-hero">
          <span className="eyebrow">About us</span>
          <h1 className="display">
            About <span>{BRAND}</span>
          </h1>
          <p>{DESCRIPTION}</p>
        </section>
        <section className="info-grid" aria-label="What we offer">
          {points.map((item) => (
            <article className="info-card" key={item.title}>
              <span className="page-icon" style={tone(item.tone)}>
                <item.icon size={20} />
              </span>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          ))}
        </section>
        <p className="page-note">
          {BRAND} is operated by <a href={COMPANY_URL}>{COMPANY}</a>.
        </p>
        <div className="cta">
          <h2 className="display">Make your first code in a minute</h2>
          <p>Free plan, no card needed.</p>
          <Link className="button large" href="/register">
            Get started free <ArrowRight size={17} />
          </Link>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
