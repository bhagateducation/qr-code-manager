import Link from "next/link";
import { ArrowRight, Check, Download, PencilLine, QrCode, ScanLine, Search, ShieldCheck, Smartphone, Trash2, Users } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { limits } from "@/lib/validation";
import Reveal from "@/components/Reveal";
import { LiveDemo, SwapDemo } from "@/components/SiteDemo";
import { ThemeControl } from "@/components/ui";

const tone = (value: string) => ({ "--tone": value }) as React.CSSProperties;
const week = [38, 52, 44, 71, 63, 88, 100];
const faq = [
  ["What is a dynamic QR code?", "The printed code holds a short permanent link. When someone scans it, they are forwarded to your destination, and you can change that destination whenever you like. Nothing needs reprinting."],
  ["Can I manage thousands of codes?", "Yes. Every code gets its own number, such as QR-00042. Search by number, name or link, filter by status, type, campaign or tag, and pause or trash many codes at once."],
  ["What if I delete a code by mistake?", "Deleted codes go to the trash and can be restored for 30 days. Only an owner or admin can delete them for good."],
  ["Do paid plans renew automatically?", "No. A paid plan lasts 30 days. When it ends your limits return to Free; nothing is deleted and your existing codes keep working."],
  ["Is there an API?", "Yes. Create and list codes with an API key, and receive a signed webhook the moment a code is scanned."],
];

export default function Home() {
  const plans = [
    { id: "free", name: "Free", price: 0, note: "For your first codes" },
    { id: "pro", name: "Pro", price: Number(process.env.PLAN_PRO_PAISE || 0) / 100, note: "For growing teams and campaigns" },
    { id: "business", name: "Business", price: Number(process.env.PLAN_BUSINESS_PAISE || 0) / 100, note: "For large collections and operations" },
  ];
  return (
    <div className="site">
      <header className="site-nav">
        <div>
          <Link href="/" className="brand">
            <span className="brand-mark">
              <QrCode size={18} />
            </span>
            {BRAND}
          </Link>
          <nav aria-label="Main">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
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

      <main className="wrap">
        <section className="hero">
          <Reveal className="hero-copy">
            <h1 className="display">
              Print once.
              <br />
              <span>Update forever.</span>
            </h1>
            <p>QR codes whose destination you can change after they are printed. Number them, find any one in seconds, and watch every scan arrive.</p>
            <div className="row-actions">
              <Link href="/register" className="button primary large">
                Start free <ArrowRight size={17} />
              </Link>
              <a href="#features" className="button large">
                See what it does
              </a>
            </div>
            <div className="hero-notes">
              <span>
                <Check size={15} /> {limits.free.codes} codes free, forever
              </span>
              <span>
                <Check size={15} /> No card needed
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <LiveDemo />
          </Reveal>
        </section>

        <div className="marquee">
          {["Restaurant menus", "Product packaging", "Business cards", "Asset labels", "Event tickets", "Guest Wi-Fi"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        <section id="features" className="site-section">
          <div className="section-intro">
            <h2 className="display">Everything a code needs after it is printed</h2>
            <p>Codes, destinations, business records and scan activity live in one workspace, so nothing gets lost between tools.</p>
          </div>
          <div className="bento">
            <article className="tile w4" style={tone("var(--c-blue)")}>
              <h3>Change the link. Keep the print.</h3>
              <p>Menus change, campaigns end, websites move. Point the same printed code somewhere new, pause it, or give it an end date.</p>
              <div className="tile-art">
                <SwapDemo />
              </div>
            </article>
            <article className="tile w2" style={tone("var(--c-green)")}>
              <h3>See every scan</h3>
              <p>Scans per day, busiest hours, devices and your top codes. Export it all to CSV.</p>
              <div className="tile-art bars" style={{ height: 96, paddingTop: 0 }} aria-hidden>
                {week.map((height, index) => (
                  <div className="bar-col" key={index}>
                    <div className="bar" style={{ height: `${height}%` }} />
                  </div>
                ))}
              </div>
            </article>
            <article className="tile w2" style={tone("var(--c-amber)")}>
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
            </article>
            <article className="tile w2" style={tone("var(--c-violet)")}>
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
            </article>
            <article className="tile w2" style={tone("var(--c-pink)")}>
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
            </article>
            <article className="tile w3" style={tone("var(--c-sky)")}>
              <h3>Built for teams</h3>
              <p>Invite people as admin, editor or viewer. Every change is written to an audit log, so you always know who did what.</p>
              <div className="tile-art chips" aria-hidden>
                {["Owner", "Admin", "Editor", "Viewer"].map((role) => (
                  <span className="chip" key={role}>
                    <Users size={13} /> {role}
                  </span>
                ))}
              </div>
            </article>
            <article className="tile w3" style={tone("var(--c-teal)")}>
              <h3>API and webhooks</h3>
              <p>Create codes from your own software and receive a signed event the moment one is scanned.</p>
              <pre className="snippet tile-art" aria-hidden>{`POST /api/v1/qr
{ "title": "Spring menu",
  "targetUrl": "https://yourshop.com/menu" }`}</pre>
            </article>
          </div>
        </section>

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
                <step.icon className="tone" style={tone(step.tone)} />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

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
              <div key={item.title} className="row-actions" style={{ alignItems: "start", flexWrap: "nowrap", gap: 14 }}>
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

        <section id="pricing" className="site-section">
          <div className="section-intro">
            <h2 className="display">Simple plans that grow with you</h2>
            <p>Start free. Paid plans last 30 days and never renew on their own.</p>
          </div>
          <div className="plans-grid">
            {plans.map((plan) => {
              const limit = limits[plan.id];
              return (
                <article className={`panel plan ${plan.id === "pro" ? "featured" : ""}`} key={plan.id}>
                  <div className="row-actions" style={{ justifyContent: "space-between" }}>
                    <h3>{plan.name}</h3>
                    {plan.id === "pro" && <span className="badge">Most popular</span>}
                  </div>
                  <p className="price">
                    {plan.id === "free" || plan.price ? `₹${plan.price.toLocaleString("en-IN")}` : "Contact us"}
                    {(plan.id === "free" || plan.price > 0) && <small className="muted"> /{plan.price ? "30 days" : "forever"}</small>}
                  </p>
                  <p className="muted">{plan.note}</p>
                  <ul>
                    {[`${limit.codes.toLocaleString()} QR codes`, `${limit.systems} business ${limit.systems === 1 ? "system" : "systems"}`, `${limit.records.toLocaleString()} records`, "Analytics, API and webhooks", "Team roles, trash and audit log"].map((line) => (
                      <li key={line}>
                        <Check size={16} /> {line}
                      </li>
                    ))}
                  </ul>
                  <Link className="button" href="/register">
                    Start free
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section id="faq" className="site-section">
          <div className="section-intro">
            <h2 className="display">Questions, answered</h2>
          </div>
          <div className="faq">
            {faq.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p className="details-content">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="cta">
          <h2 className="display">Make your first code in a minute</h2>
          <p>Free to start. Change the destination whenever you need.</p>
          <Link className="button large" href="/register">
            Get started free <ArrowRight size={17} />
          </Link>
        </section>

        <footer className="site-footer">
          <span>
            © {new Date().getFullYear()} {BRAND}
          </span>
          <span className="row-actions">
            <Link href="/login">Sign in</Link>
            <Link href="/register">Create account</Link>
          </span>
        </footer>
      </main>
    </div>
  );
}
