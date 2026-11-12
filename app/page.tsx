import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Download, PencilLine, QrCode, ScanLine, Search, ShieldCheck, Smartphone, Trash2, Users } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { getPublicPlans, getSite } from "@/lib/site";
import { getSiteOrigin } from "@/lib/site-origin";
import { checkoutConfigured } from "@/lib/payments";
import { LiveDemo, SwapDemo } from "@/components/SiteDemo";
import AgentTool from "@/components/AgentTool";
import { COMPANY, CONTACT_EMAIL, COMPANY_URL, TERMS_URL, PROFILES, DESCRIPTION } from "@/lib/public-discovery";
import ThemeControl from "@/components/ThemeControl";

const tone = (value: string) => ({ "--tone": value }) as React.CSSProperties;
const week = [38, 52, 44, 71, 63, 88, 100];
// The page is rebuilt at most once a minute, and straight away when the owner saves it in the panel.
export const revalidate = 60;

const title = `${BRAND} — Dynamic QR codes for your business`;
const description = DESCRIPTION;
const siteOrigin = getSiteOrigin();

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  ...(siteOrigin && {
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: { type: "website", url: "/", siteName: BRAND, title, description },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  }),
};

const limitLine = (value: number | null, word: string) => `${value === null ? "Unlimited" : value.toLocaleString()} ${word}`;

export default async function Home() {
  const [site, plans] = await Promise.all([getSite(), getPublicPlans()]);
  const demoLink = site.show.features ? "#features" : site.show.steps ? "#how-it-works" : null;
  const structuredData = siteOrigin && JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": new URL("#organization", siteOrigin).href,
        name: COMPANY, url: COMPANY_URL, email: CONTACT_EMAIL, sameAs: PROFILES },
      { "@type": "WebSite", name: BRAND, url: siteOrigin.href,
        publisher: { "@id": new URL("#organization", siteOrigin).href } },
      { "@type": "SoftwareApplication", name: BRAND, url: siteOrigin.href,
        description, applicationCategory: "BusinessApplication", operatingSystem: "Web",
        publisher: { "@id": new URL("#organization", siteOrigin).href } },
      ...(site.show.faq && site.faq.length ? [{
        "@type": "FAQPage", mainEntity: site.faq.map(({ q, a }) => ({
          "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }] : []),
    ],
  }).replace(/</g, "\\u003c");
  const checkoutReady = checkoutConfigured();
  const free = plans.find((plan) => plan.id === "free");
  // The plan in the middle is highlighted, as the usual pick.
  const featured = plans.length > 2 ? plans[Math.floor(plans.length / 2)].id : plans.at(-1)?.id;
  return (
    <div className="site">
      <AgentTool />
      {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />}
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
            {site.show.features && <a href="#features">Features</a>}
            {site.show.steps && <a href="#how-it-works">How it works</a>}
            {site.show.pricing && <a href="#pricing">Pricing</a>}
            {site.show.faq && <a href="#faq">FAQ</a>}
            <Link href="/login" className="site-mobile-signin">Sign in</Link>
          </nav>
          <div className="row-actions" style={{ flexWrap: "nowrap" }}>
            <ThemeControl />
            <Link href="/login" className="button">
              Sign in
            </Link>
            <Link href="/register" className="button primary">
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="wrap" tabIndex={-1}>
        <section className="hero">
          <div className="hero-copy">
            <h1 className="display">
              {site.heroLine1}
              <br />
              <span>{site.heroLine2}</span>
            </h1>
            <p>{site.heroText}</p>
            <div className="row-actions">
              <Link href="/register" className="button primary large">
                {site.ctaLabel} <ArrowRight size={17} />
              </Link>
              {demoLink && (
                <a href={demoLink} className="button large">
                  See what it does
                </a>
              )}
            </div>
            <div className="hero-notes">
              <span>
                <Check size={15} /> {free ? `${limitLine(free.codes, "codes")} free, forever` : "Free plan available"}
              </span>
              <span>
                <Check size={15} /> No card needed
              </span>
            </div>
          </div>
          <div>
            <LiveDemo />
          </div>
        </section>

        <div className="marquee">
          {site.useCases.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        {site.show.features && (
        <section id="features" className="site-section">
          <div className="section-intro">
            <h2 className="display">Everything a code needs after it is printed</h2>
            <p>Codes, destinations, business records and scan activity live in one workspace, so nothing gets lost between tools.</p>
          </div>
          <div className="bento">
            <div className="tile w4" style={tone("var(--c-blue)")}>
              <h3>Change the link. Keep the print.</h3>
              <p>Menus change, campaigns end, websites move. Point the same printed code somewhere new, pause it, or give it an end date.</p>
              <div className="tile-art">
                <SwapDemo />
              </div>
            </div>
            <div className="tile w2" style={tone("var(--c-green)")}>
              <h3>See every scan</h3>
              <p>Scans per day, busiest hours, devices and your top codes. Export it all to CSV.</p>
              <div className="tile-art bars" style={{ height: 96, paddingTop: 0 }} aria-hidden>
                {week.map((height, index) => (
                  <div className="bar-col" key={index}>
                    <div className="bar" style={{ height: `${height}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="tile w2" style={tone("var(--c-amber)")}>
              <h3>Find one among thousands</h3>
              <p>Every code has a number. Search by number, name or link, then filter and act in bulk.</p>
              <div className="tile-art mock" aria-hidden>
                <div className="mock-row">
                  <Search size={15} className="muted" /> <span className="muted">QR-00042</span>
                </div>
                <div className="mock-row">
                  <span className="qr-tile" style={{ width: 26, height: 26 }}>
                    <QrCode size={14} />
                  </span>
                  <b>Summer menu</b>
                  <span className="grow" />
                  <span className="status active">Active</span>
                </div>
              </div>
            </div>
            <div className="tile w2" style={tone("var(--c-violet)")}>
              <h3>Route by device</h3>
              <p>One code, the right place for each phone.</p>
              <div className="tile-art route" aria-hidden>
                <span>
                  <Smartphone size={14} /> iPhone
                </span>
                <em>App Store</em>
                <span>
                  <Smartphone size={14} /> Android
                </span>
                <em>Google Play</em>
                <span>Everyone else</span>
                <em>Your website</em>
              </div>
            </div>
            <div className="tile w2" style={tone("var(--c-pink)")}>
              <h3>Records with public pages</h3>
              <p>Build your own tables for products, assets or members. Publish a record and a code can open it.</p>
              <div className="tile-art mock" aria-hidden>
                <div className="mock-row">
                  <b>Blue ceramic mug</b>
                  <span className="grow" />
                  <span className="badge">Public</span>
                </div>
                <div className="mock-row">
                  <span className="muted">Capacity</span>
                  <span className="grow" />
                  350 ml
                </div>
              </div>
            </div>
            <div className="tile w3" style={tone("var(--c-sky)")}>
              <h3>Built for teams</h3>
              <p>Invite people as admin, editor or viewer. Every change is written to an audit log, so you always know who did what.</p>
              <div className="tile-art chips" aria-hidden>
                {["Owner", "Admin", "Editor", "Viewer"].map((role) => (
                  <span className="chip" key={role}>
                    <Users size={13} /> {role}
                  </span>
                ))}
              </div>
            </div>
            <div className="tile w3" style={tone("var(--c-teal)")}>
              <h3>API and webhooks</h3>
              <p>Create codes from your own software and receive a signed event the moment one is scanned.</p>
              <pre className="snippet tile-art" aria-hidden>{`POST /api/v1/qr
{ "title": "Spring menu",
  "targetUrl": "https://yourshop.com/menu" }`}</pre>
            </div>
          </div>
        </section>
        )}

        {site.show.steps && (
        <section id="how-it-works" className="site-section">
          <div className="section-intro">
            <h2 className="display">Working code in three steps</h2>
          </div>
          <ol className="steps">
            {[
              { icon: PencilLine, tone: "var(--c-blue)", title: "Create", text: "Name your code and paste a link, a Wi-Fi network or a contact." },
              { icon: Download, tone: "var(--c-violet)", title: "Download and print", text: "Every image is scan-tested before you get it, as PNG or vector SVG." },
              { icon: ScanLine, tone: "var(--c-green)", title: "Update and measure", text: "Change the destination whenever you need and watch the scans arrive." },
            ].map((step) => (
              <li className="step" key={step.title}>
                <div>
                <step.icon className="tone" style={tone(step.tone)} />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        )}

        {site.show.safety && (
        <section className="site-section">
          <div className="section-intro">
            <h2 className="display">Safe by default</h2>
            <p>Your codes are printed on real things. Losing or leaking them is not an option.</p>
          </div>
          <div className="three-col">
            {[
              { icon: ShieldCheck, tone: "var(--c-green)", title: "Two-step sign-in", text: "Protect every account with an authenticator app and one-time backup codes." },
              { icon: Trash2, tone: "var(--c-orange)", title: "30-day trash", text: "Deleted codes can be restored for a month. Only owners and admins can remove them for good." },
              { icon: Users, tone: "var(--c-sky)", title: "Separate workspaces", text: "Each business has its own workspace. Access is checked on the server for every request." },
            ].map((item) => (
              <div key={item.title} className="row-actions safe-point">
                <span className="page-icon" style={tone(item.tone)}>
                  <item.icon size={20} />
                </span>
                <div>
                  <h3 style={{ fontSize: 16 }}>{item.title}</h3>
                  <p className="muted" style={{ fontSize: 15 }}>
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {site.show.pricing && plans.length > 0 && (
        <section id="pricing" className="site-section">
          <div className="section-intro">
            <h2 className="display">Simple plans that grow with you</h2>
            <p>{checkoutReady
              ? "Start free. Paid plans run for their period and never renew on their own."
              : "Free accounts are available. Online checkout for paid plans is currently unavailable."}</p>
          </div>
          <div className="plans-grid">
            {plans.map((plan) => {
              return (
                <div className={`panel plan ${plan.id === featured ? "featured" : ""}`} key={plan.id}>
                  <div className="row-actions" style={{ justifyContent: "space-between" }}>
                    <h3>{plan.name}</h3>
                    {plan.id === featured && <span className="badge">Most popular</span>}
                  </div>
                  <p className="price">
                    ₹{(plan.pricePaise / 100).toLocaleString("en-IN")}
                    <small className="muted"> /{plan.pricePaise ? `${plan.days} days` : "forever"}</small>
                  </p>
                  {plan.description && <p className="muted">{plan.description}</p>}
                  <ul>
                    {[limitLine(plan.codes, "QR codes"), plan.storageMb === null ? "Unlimited storage" : `${plan.storageMb >= 1024 ? `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(plan.storageMb / 1024)} GB` : `${plan.storageMb} MB`} storage`, limitLine(plan.members, "team members"), limitLine(plan.panels, "extra panels"), ...(plan.allowBooks ? ["Book QR"] : []), ...(plan.allowDomain ? ["Your own domain"] : []), "Folders, trash and audit log"].map((line) => (
                      <li key={line}>
                        <Check size={16} /> {line}
                      </li>
                    ))}
                  </ul>
                  <Link className="button" href="/register">
                    Start free
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {site.show.faq && site.faq.length > 0 && (
        <section id="faq" className="site-section">
          <div className="section-intro">
            <h2 className="display">Questions, answered</h2>
          </div>
          <div className="faq">
            {site.faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p className="details-content">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
        )}

        <div className="cta">
          <h2 className="display">{site.ctaTitle}</h2>
          <p>{site.ctaText}</p>
          <Link className="button large" href="/register">
            Get started free <ArrowRight size={17} />
          </Link>
        </div>

        <footer className="site-footer">
          <span>
            © {new Date().getFullYear()} {BRAND}
          </span>
          <span className="row-actions">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <a href={TERMS_URL}>Bhagat Education terms</a>
            <Link href="/login">Sign in</Link>
            <Link href="/register">Create account</Link>
          </span>
        </footer>
      </main>
    </div>
  );
}
