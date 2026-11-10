import Link from "next/link";
import QRCode from "qrcode";
import { ArrowRight, BarChart3, Check, Code2, Layers, QrCode, RefreshCw, ShieldCheck, Smartphone, Users } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { limits } from "@/lib/validation";
import Reveal from "@/components/Reveal";
import { ThemeControl } from "@/components/ui";

const features = [
  { icon: RefreshCw, tone: "#6b54d8", title: "Change the link, keep the print", text: "Every website code is dynamic. Update its destination, pause it or set an end date without reprinting anything." },
  { icon: QrCode, tone: "#2563eb", title: "Four code types", text: "Website links, Wi-Fi access, contact cards and plain text. Each download is scan-tested before you get it, as PNG or vector SVG." },
  { icon: Smartphone, tone: "#db2777", title: "Route by device", text: "Send iPhone users to the App Store, Android users to Google Play and everyone else to your site, from one code." },
  { icon: Layers, tone: "#7c3aed", title: "Records with public pages", text: "Build your own tables for products, assets or members, then publish any record as a page a QR code can open." },
  { icon: BarChart3, tone: "#059669", title: "Scan analytics", text: "See scans per day, busiest hours, devices and your top codes. Export everything to CSV." },
  { icon: Users, tone: "#ea580c", title: "Built for teams", text: "Invite teammates as admin, editor or viewer. Every change is written to an audit log." },
  { icon: Code2, tone: "#0d9488", title: "API and webhooks", text: "Create codes from your own software and receive a signed event the moment a code is scanned." },
  { icon: ShieldCheck, tone: "#475569", title: "Secure by default", text: "Two-step sign-in, hashed sessions and keys, and strict separation between workspaces." },
];
const steps = [
  ["Create a workspace", "Sign up free in under a minute."],
  ["Add a destination", "Name your code and paste a link."],
  ["Download and print", "Use the scan-tested PNG or SVG."],
  ["Measure and update", "Watch scans and change the link any time."],
];

export default async function Home() {
  const demo = await QRCode.toDataURL(process.env.APP_URL || "https://example.com", { width: 320, margin: 2, color: { dark: "#29283d", light: "#FFFFFF" } });
  const plans = [
    { id: "free", name: "Free", price: 0, note: "For your first codes" },
    { id: "pro", name: "Pro", price: Number(process.env.PLAN_PRO_PAISE || 0) / 100, note: "For growing teams and campaigns" },
    { id: "business", name: "Business", price: Number(process.env.PLAN_BUSINESS_PAISE || 0) / 100, note: "For large collections and operations" },
  ];
  return (
    <>
      <header className="site-nav">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <QrCode size={20} />
          </span>
          {BRAND}
        </Link>
        <nav aria-label="Main">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
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
      </header>
      <main>
        <section className="site-section hero">
          <Reveal className="hero-copy">
            <span className="badge">Dynamic QR codes for business</span>
            <h1>
              Print once.
              <br />
              <em>Update forever.</em>
            </h1>
            <p>Create QR codes whose destination you can change at any time, connect them to your own business records, and see every scan in one workspace.</p>
            <div className="row-actions">
              <Link href="/register" className="button primary large">
                Create your first code <ArrowRight size={17} />
              </Link>
              <a href="#how-it-works" className="button large">
                See how it works
              </a>
            </div>
            <div className="hero-notes">
              <span>
                <Check size={15} /> Free plan with {limits.free.codes} codes
              </span>
              <span>
                <Check size={15} /> No card needed
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="hero-card">
              <div className="hero-card-row">
                <span className="qr-tile">
                  <QrCode size={18} />
                </span>
                <div className="grow">
                  <strong>Summer menu</strong>
                  <small style={{ display: "block" }}>Website link · dynamic</small>
                </div>
                <span className="status active">Active</span>
              </div>
              <div className="hero-qr">
                <img src={demo} alt={`Sample QR code that opens the ${BRAND} website`} width={232} height={232} />
              </div>
              <div className="hero-mini">
                <div>
                  <strong>PNG · SVG</strong>
                  <small>Scan-tested</small>
                </div>
                <div>
                  <strong>iOS · Android</strong>
                  <small>Device routing</small>
                </div>
                <div>
                  <strong>Live</strong>
                  <small>Scan analytics</small>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
        <div className="strip">
          {["Restaurant menus", "Product packaging", "Business cards", "Asset labels", "Event tickets", "Guest Wi-Fi"].map((item) => (
            <span className="chip" key={item}>
              {item}
            </span>
          ))}
        </div>

        <section id="features" className="site-section">
          <Reveal className="section-intro">
            <h2>Everything a printed code needs after it is printed</h2>
            <p>Codes, destinations, business data and scan activity live together, so nothing gets lost between tools.</p>
          </Reveal>
          <div className="features-grid four">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={(index % 4) * 0.06}>
                <article className="panel feature-card" style={{ height: "100%", "--tone": feature.tone } as React.CSSProperties}>
                  <feature.icon />
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="site-section">
          <Reveal className="section-intro">
            <h2>From idea to working code in four steps</h2>
          </Reveal>
          <div className="steps">
            {steps.map(([title, text], index) => (
              <Reveal key={title} delay={index * 0.06} className="step">
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="pricing" className="site-section">
          <Reveal className="section-intro">
            <h2>Simple plans that grow with you</h2>
            <p>Start free. Paid plans last 30 days and never renew on their own.</p>
          </Reveal>
          <div className="plans-grid">
            {plans.map((plan, index) => {
              const limit = limits[plan.id];
              return (
                <Reveal key={plan.id} delay={index * 0.06}>
                  <article className={`panel plan ${plan.id === "pro" ? "featured" : ""}`} style={{ height: "100%" }}>
                    <div className="row-actions" style={{ justifyContent: "space-between" }}>
                      <h3 style={{ fontSize: 16 }}>{plan.name}</h3>
                      {plan.id === "pro" && <span className="badge">Most popular</span>}
                    </div>
                    <p className="price">
                      {plan.id === "free" || plan.price ? `₹${plan.price.toLocaleString("en-IN")}` : "Contact us"}
                      {(plan.id === "free" || plan.price > 0) && <small className="muted"> /{plan.price ? "30 days" : "forever"}</small>}
                    </p>
                    <p className="muted">{plan.note}</p>
                    <ul>
                      {[`${limit.codes.toLocaleString()} QR codes`, `${limit.systems} business ${limit.systems === 1 ? "system" : "systems"}`, `${limit.records.toLocaleString()} records`, "Analytics, API and webhooks", "Team roles and audit log"].map((line) => (
                        <li key={line}>
                          <Check size={16} /> {line}
                        </li>
                      ))}
                    </ul>
                    <Link className={`button ${plan.id === "pro" ? "primary" : ""}`} href="/register">
                      Start free
                    </Link>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="site-section" style={{ paddingTop: 0 }}>
          <Reveal>
            <div className="cta">
              <h2>Make your first code in a minute</h2>
              <p>Free to start. Change the destination whenever you need.</p>
              <Link className="button large" href="/register">
                Get started free <ArrowRight size={17} />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
      <footer className="site-footer">
        <span>
          © {new Date().getFullYear()} {BRAND}
        </span>
        <span className="row-actions">
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create account</Link>
        </span>
      </footer>
    </>
  );
}
