import Link from "next/link";
import {
  QrCode,
  ArrowUpRight,
  Check,
  Layers,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import QRCode from "qrcode";
export default async function Home() {
  const demo = await QRCode.toDataURL(
    process.env.APP_URL || "https://rosybrown-narwhal-127133.hostingersite.com",
    { width: 320, margin: 4, color: { dark: "#17161D", light: "#FFFFFF" } },
  );
  return (
    <div className="marketing">
      <header className="marketing-nav">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <QrCode size={22} />
          </span>
          QR Manager
        </Link>
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="row-actions">
          <Link href="/login" className="button">
            Sign in
          </Link>
          <Link href="/register" className="button primary">
            Start free <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>
      <main>
        <section className="marketing-hero">
          <div className="hero-copy">
            <span className="badge">
              <span className="status-dot" />A better connection starts here
            </span>
            <h1>
              Small code.
              <br />
              Endless possibilities.
            </h1>
            <p>
              Bring your physical world online. Create QR codes that evolve with
              your business, organise your records, and see every connection in
              one workspace.
            </p>
            <div className="hero-actions">
              <Link href="/register" className="button primary">
                Create your first QR <ArrowRight size={17} />
              </Link>
              <a href="#how-it-works" className="button">
                See how it works
              </a>
            </div>
            <div className="hero-notes">
              <span>
                <Check size={15} />
                Free plan included
              </span>
              <span>
                <Check size={15} />
                No card required
              </span>
            </div>
          </div>
          <div className="hero-workbench">
            <div className="workbench-top">
              <span className="window-dots">
                <i />
                <i />
                <i />
              </span>
              <strong>Your next connection</strong>
              <span className="badge">Example</span>
            </div>
            <div className="sample-qr">
              <div className="sample-label">
                <span className="mini-icon">
                  <QrCode size={18} />
                </span>
                <div>
                  <strong>Your business, one scan away</strong>
                  <small>Dynamic website QR</small>
                </div>
                <span className="status active">Ready</span>
              </div>
              <div className="hero-qr-art">
                <img
                  src={demo}
                  alt="Sample QR linking to the QR Manager homepage"
                  width={232}
                  height={232}
                />
                <span className="corner tl" />
                <span className="corner tr" />
                <span className="corner bl" />
                <span className="corner br" />
              </div>
              <p className="sample-url">
                Scan to explore QR Manager <ArrowUpRight size={15} />
              </p>
              <div className="sample-detail">
                <RefreshCw size={18} />
                <span>New destination. Same printed code.</span>
              </div>
            </div>
            <div className="connection-note">
              <ShieldCheck size={21} />
              <div>
                <strong>A workspace of your own.</strong>
                <small>Access is checked before your data is shared.</small>
              </div>
            </div>
          </div>
        </section>
        <section className="use-cases">
          <p>Built for everyday business connections</p>
          <div>
            <span>Menus & hospitality</span>
            <span>Product packaging</span>
            <span>Business websites</span>
            <span>Asset records</span>
            <span>Campaign links</span>
          </div>
        </section>
        <section id="features" className="marketing-section">
          <div className="section-intro">
            <h2>
              Less to manage.
              <br />
              More to connect.
            </h2>
            <p>
              Your codes, destinations and business information belong together.
              QR Manager keeps them in a single, organised workspace.
            </p>
          </div>
          <div className="features-grid">
            {[
              {
                icon: RefreshCw,
                title: "Change the link. Keep the QR.",
                text: "Update destinations without replacing printed materials. Pause a code or set an expiry when a campaign ends.",
              },
              {
                icon: Layers,
                title: "Give your information a home.",
                text: "Define custom text, number, date, URL and checkbox fields, then create and edit structured business records.",
              },
              {
                icon: BarChart3,
                title: "See the connections happen.",
                text: "Track scan counts and recent device activity. Export the displayed scan report as a CSV.",
              },
            ].map((f) => (
              <article key={f.title}>
                <span className="feature-icon">
                  <f.icon size={25} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          id="how-it-works"
          className="marketing-section process-section"
        >
          <div className="section-intro">
            <h2>
              From an idea
              <br />
              to a working QR.
            </h2>
            <p>Simple steps. A permanent connection.</p>
          </div>
          <div className="process-grid">
            {[
              {
                n: "01",
                title: "Create your workspace",
                text: "Sign up and start on the Free plan.",
              },
              {
                n: "02",
                title: "Save your destination",
                text: "Name your QR and add its website link.",
              },
              {
                n: "03",
                title: "Download and print",
                text: "Use a decoded PNG or a true vector SVG.",
              },
              {
                n: "04",
                title: "Manage and measure",
                text: "Update destinations and review scan activity.",
              },
            ].map((step) => (
              <article key={step.n}>
                <span>{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="pricing" className="marketing-section">
          <div className="section-intro">
            <h2>
              A plan for your
              <br />
              next stage.
            </h2>
            <p>
              Start free. Choose more capacity when your business needs it. Paid
              plans will open once payment activation is complete.
            </p>
          </div>
          <div className="plans-grid">
            {[
              { name: "Free", price: 0, codes: 10, systems: 1, records: 50 },
              {
                name: "Pro",
                price: 499,
                codes: 500,
                systems: 10,
                records: 5000,
              },
              {
                name: "Business",
                price: 1499,
                codes: 2500,
                systems: 50,
                records: 25000,
              },
            ].map((plan) => (
              <article
                className={`panel plan ${plan.name === "Pro" ? "featured" : ""}`}
                key={plan.name}
              >
                <h3>{plan.name}</h3>
                <div className="price">
                  ₹{plan.price.toLocaleString("en-IN")}
                  <small>/{plan.price ? "30 days" : "forever"}</small>
                </div>
                <p>
                  {plan.name === "Free"
                    ? "For your first business connections."
                    : plan.name === "Pro"
                      ? "For growing teams and campaigns."
                      : "For larger collections and operations."}
                </p>
                <ul>
                  <li>
                    <Check size={16} />
                    {plan.codes.toLocaleString()} dynamic QR codes
                  </li>
                  <li>
                    <Check size={16} />
                    {plan.systems} business systems
                  </li>
                  <li>
                    <Check size={16} />
                    {plan.records.toLocaleString()} records
                  </li>
                  <li>
                    <Check size={16} />
                    PNG & SVG downloads
                  </li>
                  <li>
                    <Check size={16} />
                    Scan activity & device routing
                  </li>
                </ul>
                <Link
                  className={`button ${plan.name === "Pro" ? "primary" : ""}`}
                  href="/register"
                >
                  Start with a free account <ArrowUpRight size={15} />
                </Link>
              </article>
            ))}
          </div>
          <p className="pricing-note">
            Paid plans use manual renewal for each 30-day period. No automatic
            recurring charge.
          </p>
        </section>
        <section className="final-cta">
          <QrCode size={32} />
          <h2>What will you connect next?</h2>
          <p>Make your first QR code in your own workspace.</p>
          <Link className="button primary" href="/register">
            Get started free <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <footer className="marketing-footer">
        <Link className="brand" href="/">
          QR Manager
        </Link>
        <p>Every code. Every connection.</p>
        <Link href="/login">Open your workspace</Link>
      </footer>
    </div>
  );
}
