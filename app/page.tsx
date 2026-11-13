import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Download, PencilLine, QrCode, ScanLine, Search, ShieldCheck, Smartphone, Trash2, Users, X } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { getPublicPlans, getSite } from "@/lib/site";
import { getSiteOrigin } from "@/lib/site-origin";
import { checkoutConfigured } from "@/lib/payments";
import { LiveDemo, SwapDemo, TypeGrid } from "@/components/SiteDemo";
import AgentTool from "@/components/AgentTool";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { QR_TYPES } from "@/lib/qr-types";
import { COMPANY, CONTACT_EMAIL, COMPANY_URL, PROFILES, DESCRIPTION } from "@/lib/public-discovery";

const tone = (value: string) => ({ "--tone": value }) as React.CSSProperties;
const week = [38, 52, 44, 71, 63, 88, 100];
// The page is rebuilt at most once a minute, and straight away when the owner saves it in the panel.
export const revalidate = 60;

const title = `${BRAND} — Free Link, Text, Wi-Fi, Image & Book QR Codes`;
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

const limitLine = (value: number | null, word: string) => `${value === null ? "Unlimited" : value.toLocaleString()} ${value === 1 ? word.replace(/s$/, "") : word}`;

type PublicPlan = Awaited<ReturnType<typeof getPublicPlans>>[number];
const amount = (value: number | null) => (value === null ? "Unlimited" : value.toLocaleString("en-IN"));
// Rows of the plan comparison. Limits and switches come from the plan itself; `true` rows are part of every plan.
const COMPARE: { name: string; text: string; value: (plan: PublicPlan) => string | boolean }[] = [
  { name: "QR codes", text: "How many working codes the account can hold at one time. Codes in the trash do not count.", value: (plan) => amount(plan.codes) },
  { name: "Edit the link after printing", text: "Dynamic codes: change where a printed code leads, pause it or give it an end date.", value: () => true },
  { name: "All single QR types", text: "Link, text, Wi-Fi, contact card, image, PDF, video, WhatsApp, location, social, menu and review codes.", value: () => true },
  { name: "PNG and SVG download", text: "Scan-tested images for screens and vector files for printing, with your name and number as a label.", value: () => true },
  { name: "Scan analytics", text: "Scans per day, busiest hours, phone types and top codes, with CSV export.", value: () => true },
  { name: "iPhone and Android links", text: "One code that sends each kind of phone to its own link, such as each app store.", value: () => true },
  { name: "Folders, tags, trash and audit log", text: "Sort codes, restore deleted ones for 30 days and see who changed what.", value: () => true },
  { name: "Two-step sign-in", text: "Protect the account with a code from an authenticator app.", value: () => true },
  { name: "Books and Questions QR", text: "Make a folder per chapter and a code for every question of a book in one step.", value: (plan) => plan.allowBooks },
  { name: "Team members", text: "People who can sign in to the account as admin, editor or viewer.", value: (plan) => amount(plan.members) },
  { name: "Extra panels", text: "Separate workspaces inside one account, for branches, departments or clients.", value: (plan) => (plan.panels === 0 ? false : amount(plan.panels)) },
  { name: "Systems (your own tables)", text: "Tables for products, assets or members, with the fields you choose.", value: (plan) => amount(plan.systems) },
  { name: "Records with public pages", text: "Rows in your tables. A published record gets a page that a code can open.", value: (plan) => amount(plan.records) },
  { name: "Storage", text: "Space for your codes, records and scan history.", value: (plan) => (plan.storageMb === null ? "Unlimited" : plan.storageMb >= 1024 ? `${+(plan.storageMb / 1024).toFixed(1)} GB` : `${plan.storageMb} MB`) },
  { name: "API keys and webhooks", text: "Create codes from your own software and get a signed event on every scan.", value: (plan) => plan.allowApi },
  { name: "Your own domain", text: "Short links on your domain instead of ours, so printed codes carry your name.", value: (plan) => plan.allowDomain },
];

export default async function Home() {
  const [site, plans] = await Promise.all([getSite(), getPublicPlans()]);
  const demoLink = site.show.features ? "#features" : site.show.steps ? "#how-it-works" : null;
  const telephone = process.env.PUBLIC_BUSINESS_PHONE?.trim();
  const address = process.env.PUBLIC_BUSINESS_ADDRESS?.trim();
  const structuredData = siteOrigin && JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": new URL("#organization", siteOrigin).href,
        name: COMPANY, url: COMPANY_URL, email: CONTACT_EMAIL, sameAs: PROFILES,
        ...(telephone && { telephone }), ...(address && { address }) },
      { "@type": "WebSite", name: BRAND, url: siteOrigin.href,
        publisher: { "@id": new URL("#organization", siteOrigin).href } },
      { "@type": "SoftwareApplication", name: BRAND, url: siteOrigin.href,
        description, applicationCategory: "BusinessApplication", operatingSystem: "Web",
        featureList: QR_TYPES.map((type) => type.name),
        publisher: { "@id": new URL("#organization", siteOrigin).href } },
      ...(site.show.faq && site.faq.length ? [{
        "@type": "FAQPage", mainEntity: site.faq.map(({ q, a }) => ({
          "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }] : []),
    ],
  }).replace(/</g, "\\u003c");
  const checkoutReady = await checkoutConfigured();
  const free = plans.find((plan) => plan.id === "free");
  // The plan in the middle is highlighted, as the usual pick.
  const featured = plans.length > 2 ? plans[Math.floor(plans.length / 2)].id : plans.at(-1)?.id;
  return (
    <div className="site">
      <AgentTool />
      {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />}
      <SiteHeader show={site.show} home />

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
                <Check size={15} /> {free ? `${limitLine(free.codes, "QR codes")} free, forever` : "Free plan available"}
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

        <section id="qr-types" className="site-section">
          <div className="section-intro">
            <h2 className="display">Every kind of QR code, in one generator</h2>
            <p>Make link, text, Wi-Fi, contact, book and question QR codes, and point a code at any image, PDF, video or page.</p>
          </div>
          <TypeGrid />
        </section>

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
          <div className="compare-wrap">
            <h3 className="display">Compare every plan in detail</h3>
            <div className="table-scroll">
              <table className="compare">
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    {plans.map((plan) => (
                      <th scope="col" key={plan.id}>{plan.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.name}>
                      <th scope="row">
                        {row.name}
                        <small>{row.text}</small>
                      </th>
                      {plans.map((plan) => {
                        const value = row.value(plan);
                        return (
                          <td key={plan.id}>
                            {value === true ? (
                              <span className="yes"><Check size={16} /><span className="sr-only">Included</span></span>
                            ) : value === false ? (
                              <span className="no"><X size={16} /><span className="sr-only">Not included</span></span>
                            ) : (
                              value
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

        <SiteFooter />
      </main>
    </div>
  );
}
