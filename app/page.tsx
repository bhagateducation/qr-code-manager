'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import ThreeHero from '@/components/ui/ThreeHero';
import {
  QrCode,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Sparkles,
  Smartphone,
  Globe,
  Sliders,
  Check,
  Database,
  BarChart3,
  Lock,
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      title: 'Dynamic Routing Without Re-Print',
      desc: 'Change QR destination URL, download links, or executable actions anytime while physical packaging is already distributed.',
      icon: Zap,
    },
    {
      title: 'Universal Business Schema Engine',
      desc: 'Model custom records for Inventories, Restaurant Menus, VIP Badges, and Assets with 23 data field types.',
      icon: Database,
    },
    {
      title: 'Device & Geo Conditional Rules',
      desc: 'Smart-redirect iPhone scanners to App Store, Android to Google Play, and native languages by country.',
      icon: Smartphone,
    },
    {
      title: 'Vector SVG & 300 DPI Print Export',
      desc: 'Download crisp vector formats ready for industrial offset printing, vinyl decals, and packaging design.',
      icon: QrCode,
    },
    {
      title: 'Multi-Tenant Client Isolation',
      desc: 'Full workspace data separation with role-based permissions (Owner, Admin, Editor, Viewer).',
      icon: Lock,
    },
    {
      title: 'Real-Time Edge Telemetry',
      desc: 'Hardware device detection, browser telemetry, and scan volume tracking with sub-50ms latency.',
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen bg-page text-ink selection:bg-brand-soft selection:text-brand relative overflow-x-hidden">
      {/* Top Demo Pill Switcher */}
      <div className="bg-[#17161D] text-gray-300 py-2 px-4 text-xs border-b border-gray-800 flex flex-wrap items-center justify-between gap-2 z-50 relative">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white tracking-tight">QR Code Manager SaaS</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">Next.js 15 Commercial Edition</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/dashboard"
            className="px-3 py-1 rounded-xl bg-brand text-white font-bold hover:bg-[#4d36bd] transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Unified Panel</span>
          </Link>
          <Link
            href="/login"
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-medium transition-colors"
          >
            Register Free
          </Link>
        </div>
      </div>

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 h-16 border-b border-line bg-surface/85 backdrop-blur-xl flex items-center">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-decoration-none">
            <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center font-bold shadow-md shadow-brand/25">
              <QrCode className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-ink">
              QR<span className="text-brand">Manager</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted">
            <a href="#features" className="hover:text-brand transition-colors">Features</a>
            <a href="#studio" className="hover:text-brand transition-colors">3D QR Studio</a>
            <a href="#pricing" className="hover:text-brand transition-colors">Pricing</a>
            <Link href="/dashboard" className="hover:text-brand transition-colors">Unified Dashboard</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-ink hover:text-brand px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs font-bold bg-brand text-white hover:bg-[#4d36bd] px-4 py-2 rounded-2xl transition-all shadow-md shadow-brand/20 active:scale-95 flex items-center gap-1.5"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 relative overflow-hidden text-center">
        {/* Soft Glowing Ambient Circles */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-brand/15 via-[#EEEAFE] to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Pill Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-soft border border-brand/20 text-brand text-xs font-bold mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span>Universal QR Business Operating System</span>
            <span className="text-brand/40">|</span>
            <span className="font-normal text-muted">Next.js 15 + Hostinger MySQL</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight max-w-4xl mx-auto leading-[1.12]"
          >
            Build any <span className="text-brand underline decoration-brand/30 underline-offset-8">QR-powered</span> business system
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed"
          >
            Model products, restaurant menus, employee IDs, inventory assets, and warranty passes with custom fields, dynamic routing rules, and executable functions — all inside a single unified panel.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-brand text-white font-bold text-sm shadow-xl shadow-brand/25 hover:bg-[#4d36bd] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white border border-line text-ink font-bold text-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Explore Unified Panel</span>
            </Link>
          </motion.div>

          {/* Three.js Interactive 3D QR Hero Canvas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-8"
          >
            <ThreeHero />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-surface border-y border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-ink tracking-tight">
              Commercial-Grade QR Infrastructure
            </h2>
            <p className="mt-3 text-sm text-muted">
              Built for production deployments, multi-tenant businesses, and continuous offline/online synchronization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={i}
                  className="p-7 rounded-3xl bg-page/60 border border-line hover:border-brand/40 hover:bg-white hover:shadow-soft-hover transition-all"
                >
                  <div className="w-11 h-11 rounded-2xl bg-brand-soft text-brand flex items-center justify-center font-bold mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-ink mb-2">{feat.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-ink tracking-tight">Transparent Pricing</h2>
            <p className="mt-3 text-sm text-muted">No hidden fees. Scale your physical QR operations smoothly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="p-8 rounded-3xl bg-white border border-line shadow-soft flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-ink">Starter</h3>
                <div className="text-3xl font-extrabold text-ink my-3">$0</div>
                <p className="text-xs text-muted mb-6">Perfect for small projects & prototypes.</p>
                <ul className="space-y-2.5 text-xs text-ink border-t border-line pt-4">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 1 Business System</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 50 Dynamic QR Codes</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 1,000 monthly scans</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 block text-center py-3 rounded-2xl border border-line hover:border-brand text-xs font-bold text-ink hover:text-brand transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro (Highlighted) */}
            <div className="p-8 rounded-3xl bg-white border-2 border-brand shadow-xl relative flex flex-col justify-between ring-2 ring-brand/10">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                Most Popular
              </span>
              <div>
                <h3 className="font-bold text-lg text-ink">Professional</h3>
                <div className="text-3xl font-extrabold text-ink my-3">$29 <span className="text-xs text-muted font-normal">/mo</span></div>
                <p className="text-xs text-muted mb-6">For growing venues, inventories, and events.</p>
                <ul className="space-y-2.5 text-xs text-ink border-t border-line pt-4">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 10 Business Systems</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 1,000 Dynamic QR Codes</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 50,000 monthly scans</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Device & location routing rules</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Print-ready 300 DPI Vector PDF</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 block text-center py-3 rounded-2xl bg-brand text-white text-xs font-bold shadow-md shadow-brand/20 hover:bg-[#4d36bd] transition-colors"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded-3xl bg-white border border-line shadow-soft flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-ink">Agency Enterprise</h3>
                <div className="text-3xl font-extrabold text-ink my-3">$89 <span className="text-xs text-muted font-normal">/mo</span></div>
                <p className="text-xs text-muted mb-6">For large retail chains and multi-client agencies.</p>
                <ul className="space-y-2.5 text-xs text-ink border-t border-line pt-4">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Unlimited Systems & Records</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Unlimited Dynamic QRs</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 500,000+ monthly edge scans</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Multi-tenant client portals</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 block text-center py-3 rounded-2xl border border-line hover:border-brand text-xs font-bold text-ink hover:text-brand transition-colors"
              >
                Contact Enterprise
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-[#17161D] text-gray-400 text-xs border-t border-gray-800 text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand" />
            <span className="font-bold text-white">QR Code Manager SaaS</span>
          </div>
          <div>© 2026 QR Code Manager SaaS. All rights reserved. Powered by Next.js 15 & Hostinger MySQL.</div>
        </div>
      </footer>
    </div>
  );
}
