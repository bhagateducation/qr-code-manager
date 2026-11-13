'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  QrCode,
  ArrowRight,
  ShieldCheck,
  Zap,
  Smartphone,
  Globe,
  Check,
  Database,
  BarChart3,
  Lock,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { SITE_URL } from '@/lib/site';

// three.js (~600 KB) loads in its own chunk after the page is interactive.
const ThreeHero = dynamic(() => import('@/components/ui/ThreeHero'), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse bg-[radial-gradient(circle_at_50%_45%,rgba(47,123,255,0.18),transparent_60%)]" />,
});

const EASE = [0.22, 1, 0.36, 1] as const;

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#studio', label: '3D QR Studio' },
  { href: '#pricing', label: 'Pricing' },
  { href: '/dashboard', label: 'Unified Dashboard' },
];

const features = [
  { title: 'Dynamic Routing Without Re-Print', desc: 'Change QR destination URL, download links, or executable actions anytime while physical packaging is already distributed.', icon: Zap },
  { title: 'Universal Business Schema Engine', desc: 'Model custom records for Inventories, Restaurant Menus, VIP Badges, and Assets with 23 data field types.', icon: Database },
  { title: 'Device & Geo Conditional Rules', desc: 'Smart-redirect iPhone scanners to App Store, Android to Google Play, and native languages by country.', icon: Smartphone },
  { title: 'Vector SVG & 300 DPI Print Export', desc: 'Download crisp vector formats ready for industrial offset printing, vinyl decals, and packaging design.', icon: QrCode },
  { title: 'Multi-Tenant Client Isolation', desc: 'Full workspace data separation with role-based permissions (Owner, Admin, Editor, Viewer).', icon: Lock },
  { title: 'Real-Time Edge Telemetry', desc: 'Hardware device detection, browser telemetry, and scan volume tracking with sub-50ms latency.', icon: BarChart3 },
];

const plans = [
  { name: 'Starter', price: 0, note: 'Perfect for small projects & prototypes.', items: ['1 Business System', '50 Dynamic QR Codes', '1,000 monthly scans'], cta: 'Get Started Free', hot: false },
  { name: 'Professional', price: 29, note: 'For growing venues, inventories, and events.', items: ['10 Business Systems', '1,000 Dynamic QR Codes', '50,000 monthly scans', 'Device & location routing rules', 'Print-ready 300 DPI Vector PDF'], cta: 'Start 14-Day Free Trial', hot: true },
  { name: 'Agency Enterprise', price: 89, note: 'For large retail chains and multi-client agencies.', items: ['Unlimited Systems & Records', 'Unlimited Dynamic QRs', '500,000+ monthly edge scans', 'Multi-tenant client portals'], cta: 'Contact Enterprise', hot: false },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'QR Code Manager',
  url: SITE_URL,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Dynamic QR code platform with custom business schemas, device and geo routing, scan analytics and print-ready export.',
  offers: plans.map((p) => ({ '@type': 'Offer', name: p.name, price: p.price, priceCurrency: 'USD' })),
  featureList: features.map((f) => f.title),
};

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.7, ease: EASE },
};

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen text-white bg-[#050A1F] overflow-x-hidden relative">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        {/* Navy colour grade */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,#17307A_0%,#0B1538_45%,#050A1F_100%)]" />
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(47,123,255,0.35),transparent_70%)]" />

        {/* Top demo bar */}
        <div className="border-b border-white/10 bg-white/[0.03] text-[11px] text-white/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] shrink-0" />
              <span className="font-medium text-white/85 truncate">QR Code Manager SaaS</span>
              <span className="hidden sm:inline text-white/30">|</span>
              <span className="hidden sm:inline">Next.js 15 Commercial Edition</span>
            </div>
            <Link href="/dashboard" className="shrink-0 flex items-center gap-1 text-[#8DB8FF] hover:text-white transition-colors">
              <Sparkles className="w-3 h-3" aria-hidden /> Open Unified Panel
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className={`sticky top-0 z-40 transition-colors duration-300 border-b ${scrolled ? 'bg-[#050A1F]/80 backdrop-blur-xl border-white/10' : 'bg-transparent border-transparent'}`}>
          <div className="max-w-6xl mx-auto h-14 px-4 sm:px-6 flex justify-between md:grid md:grid-cols-[1fr_auto_1fr] items-center">
            <Link href="/" aria-label="QR Code Manager home" className="flex items-center gap-2 justify-self-start">
              <span className="w-7 h-7 rounded-lg bg-[#2F7BFF] flex items-center justify-center">
                <QrCode className="w-4 h-4" aria-hidden />
              </span>
              <span className="font-semibold text-[14px] tracking-tight">QR<span className="text-[#6EA8FF]">Manager</span></span>
            </Link>

            <nav aria-label="Main" className="hidden md:flex items-center gap-1 text-[12px] text-white/70">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="px-3 py-1.5 rounded-full hover:bg-white/10 hover:text-white transition-colors">{n.label}</Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 justify-self-end">
              <Link href="/login" className="hidden md:inline-block text-[12px] text-white/75 hover:text-white px-3 py-1.5 transition-colors">Sign In</Link>
              <Link href="/register" className="hidden sm:flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[#2F7BFF] hover:bg-[#4A8DFF] text-[12px] font-medium shadow-[0_8px_24px_-6px_rgba(47,123,255,0.8)] transition-colors">
                Start Free Trial <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                className="md:hidden w-9 h-9 rounded-full border border-white/15 bg-white/[0.06] flex items-center justify-center active:scale-95 transition-transform"
              >
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {menuOpen && (
              <motion.nav
                id="mobile-menu"
                aria-label="Mobile"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="md:hidden absolute inset-x-3 top-[3.75rem] rounded-2xl border border-white/10 bg-[#0A1230]/95 backdrop-blur-xl p-2 shadow-2xl"
              >
                {[...NAV, { href: '/login', label: 'Sign In' }].map((n, i) => (
                  <motion.div key={n.href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i, duration: 0.25 }}>
                    <Link href={n.href} onClick={() => setMenuOpen(false)} className="flex items-center justify-between px-3 h-11 rounded-xl text-[13px] text-white/85 hover:bg-white/[0.06]">
                      {n.label} <ArrowRight className="w-3.5 h-3.5 text-white/40" aria-hidden />
                    </Link>
                  </motion.div>
                ))}
                <Link href="/register" onClick={() => setMenuOpen(false)} className="mt-1 flex items-center justify-center gap-1.5 h-11 rounded-xl bg-[#2F7BFF] text-[13px] font-medium">
                  Start Free Trial <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                </Link>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>

        <main>
          {/* Hero */}
          <section aria-labelledby="hero-title" className="relative pt-12 sm:pt-16 pb-12 px-4 sm:px-6 text-center">
            <div className="max-w-4xl mx-auto">
              <p className="fade-up inline-flex flex-wrap justify-center items-center gap-x-2 gap-y-0.5 px-3 py-1 rounded-full border border-white/15 bg-white/[0.06] text-[11px] text-white/80">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F7BFF]" aria-hidden />
                Universal QR Business Operating System
                <span className="hidden sm:inline text-white/30">|</span>
                <span className="hidden sm:inline text-white/55">Next.js 15 + Hostinger MySQL</span>
              </p>

              <h1 id="hero-title" style={{ animationDelay: '80ms' }}
                className="fade-up mt-6 text-[30px] sm:text-[44px] lg:text-[54px] font-semibold tracking-[-0.025em] leading-[1.1] text-balance">
                Build any <span className="text-[#5AA0FF]">QR-powered</span> business system
              </h1>

              <p style={{ animationDelay: '160ms' }} className="fade-up mt-5 text-[13px] sm:text-[14px] text-white/65 max-w-xl mx-auto leading-relaxed">
                Model products, restaurant menus, employee IDs, inventory assets, and warranty passes with custom fields, dynamic routing rules, and executable functions, all inside a single unified panel.
              </p>

              <div style={{ animationDelay: '240ms' }} className="fade-up mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 max-w-xs sm:max-w-none mx-auto">
                <Link href="/register" className="h-11 px-6 rounded-full bg-[#2F7BFF] hover:bg-[#4A8DFF] text-[13px] font-medium flex items-center justify-center gap-2 shadow-[0_12px_32px_-8px_rgba(47,123,255,0.9)] active:scale-[0.97] transition-all">
                  Create Free Account <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                <Link href="/dashboard" className="h-11 px-6 rounded-full border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-[13px] font-medium flex items-center justify-center active:scale-[0.97] transition-all">
                  Explore Unified Panel
                </Link>
              </div>
            </div>

            {/* 3D studio window */}
            <div id="studio" style={{ animationDelay: '360ms' }} className="fade-up relative mt-12 max-w-4xl mx-auto">
              <div className="relative rounded-2xl border border-white/10 bg-[#0A1230]/80 p-2 shadow-[0_40px_120px_-30px_rgba(47,123,255,0.5)]">
                <div className="flex items-center gap-1.5 px-3 py-2" aria-hidden>
                  <span className="w-2 h-2 rounded-full bg-white/25" /><span className="w-2 h-2 rounded-full bg-white/25" /><span className="w-2 h-2 rounded-full bg-white/25" />
                  <span className="ml-3 text-[10px] text-white/40">qrmanager.app / studio</span>
                </div>
                <div role="img" aria-label="Interactive 3D QR code preview" className="h-[260px] sm:h-[380px] rounded-xl overflow-hidden bg-[radial-gradient(circle_at_50%_40%,rgba(47,123,255,0.22),transparent_65%)]">
                  <ThreeHero />
                </div>
              </div>

              <motion.div aria-hidden animate={{ y: [0, -7, 0] }} transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
                className="hidden md:flex absolute -left-8 top-16 items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white text-[#0B1538] shadow-2xl text-[12px] text-left">
                <span className="w-7 h-7 rounded-lg bg-[#2F7BFF]/15 text-[#2F7BFF] flex items-center justify-center"><BarChart3 className="w-3.5 h-3.5" /></span>
                <span><span className="block text-[10px] text-[#5B6785]">Scans today</span><span className="font-semibold">12,480</span></span>
              </motion.div>
              <motion.div aria-hidden animate={{ y: [0, 7, 0] }} transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }}
                className="hidden md:flex absolute -right-8 bottom-20 items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white text-[#0B1538] shadow-2xl text-[12px] text-left">
                <span className="w-7 h-7 rounded-lg bg-[#10B981]/15 text-[#16794B] flex items-center justify-center"><Globe className="w-3.5 h-3.5" /></span>
                <span><span className="block text-[10px] text-[#5B6785]">Routing</span><span className="font-semibold">iOS → App Store</span></span>
              </motion.div>
            </div>
          </section>

          {/* Features */}
          <section id="features" aria-labelledby="features-title" className="py-16 sm:py-20 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
              <motion.div {...reveal} className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
                <h2 id="features-title" className="text-[22px] sm:text-[30px] font-semibold tracking-tight">Commercial-Grade QR Infrastructure</h2>
                <p className="mt-3 text-[13px] text-white/60">
                  Built for production deployments, multi-tenant businesses, and continuous offline/online synchronization.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {features.map((feat, i) => {
                  const Icon = feat.icon;
                  return (
                    <motion.article key={feat.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: (i % 3) * 0.07, duration: 0.6, ease: EASE }}
                      whileHover={{ y: -4 }}
                      className="h-full p-5 sm:p-6 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] hover:border-[#2F7BFF]/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-[#2F7BFF]/15 text-[#6EA8FF] flex items-center justify-center mb-4">
                        <Icon className="w-[18px] h-[18px]" aria-hidden />
                      </div>
                      <h3 className="font-semibold text-[14px] mb-1.5">{feat.title}</h3>
                      <p className="text-[12px] text-white/60 leading-relaxed">{feat.desc}</p>
                    </motion.article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" aria-labelledby="pricing-title" className="py-16 sm:py-20 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto">
              <motion.div {...reveal} className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
                <h2 id="pricing-title" className="text-[22px] sm:text-[30px] font-semibold tracking-tight">Transparent Pricing</h2>
                <p className="mt-3 text-[13px] text-white/60">No hidden fees. Scale your physical QR operations smoothly.</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-4 items-stretch">
                {plans.map((p, i) => (
                  <motion.article key={p.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: i * 0.08, duration: 0.6, ease: EASE }}
                    className={`relative flex flex-col p-6 sm:p-7 rounded-2xl border ${p.hot ? 'bg-[#2F7BFF]/[0.12] border-[#2F7BFF] shadow-[0_24px_60px_-20px_rgba(47,123,255,0.6)]' : 'bg-white/[0.05] border-white/10'}`}>
                    {p.hot && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2F7BFF] text-white text-[10px] font-medium px-3 py-1 rounded-full whitespace-nowrap">Most Popular</span>
                    )}
                    <h3 className="font-semibold text-[15px]">{p.name}</h3>
                    <div className="text-[30px] font-semibold tracking-tight my-2">
                      ${p.price}{p.price > 0 && <span className="text-[12px] text-white/55 font-normal"> /mo</span>}
                    </div>
                    <p className="text-[12px] text-white/60 mb-5">{p.note}</p>
                    <ul className="space-y-2.5 text-[12px] border-t border-white/10 pt-5 flex-1">
                      {p.items.map((it) => (
                        <li key={it} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 mt-0.5 text-[#34D399] shrink-0" aria-hidden /> {it}</li>
                      ))}
                    </ul>
                    <Link href="/register" className={`mt-7 flex items-center justify-center h-10 rounded-full text-[12px] font-medium transition-colors ${p.hot ? 'bg-[#2F7BFF] hover:bg-[#4A8DFF]' : 'border border-white/20 hover:bg-white/10'}`}>
                      {p.cta}
                    </Link>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="py-8 border-t border-white/10 text-[11px] text-white/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#6EA8FF]" aria-hidden />
              <span className="font-medium text-white/80">QR Code Manager SaaS</span>
            </div>
            <p>© 2026 QR Code Manager SaaS. All rights reserved. Powered by Next.js 15 &amp; Hostinger MySQL.</p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
