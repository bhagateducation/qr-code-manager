'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { QrCode, UserPlus, Eye, EyeOff, ShieldCheck, Check } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password strength logic
  const getStrength = (p: string) => {
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p) || /[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };
  const strengthScore = getStrength(password);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const session = {
      token: 'qrm_tok_' + Math.random().toString(36).substring(2),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      user: {
        id: 'usr_' + Date.now().toString(36),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'owner',
        workspace: workspace.trim() || `${name}'s Workspace`,
      },
    };

    localStorage.setItem('qrm_session_v1', JSON.stringify(session));

    setTimeout(() => {
      router.push('/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col justify-between selection:bg-brand-soft selection:text-brand relative overflow-x-hidden">
      {/* Ambient Glowing Orbs */}
      <div className="fixed top-12 right-1/4 w-96 h-96 bg-brand/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-12 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <header className="py-4 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center font-bold shadow-md shadow-brand/25">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-ink">
            QR<span className="text-brand">Manager</span>
          </span>
        </Link>
        <div className="text-xs text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-brand font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </header>

      {/* Register Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="max-w-md w-full bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl p-7 sm:p-9 shadow-glass relative"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-soft text-brand mb-3 shadow-sm">
              <UserPlus className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-ink tracking-tight">Create your free workspace</h1>
            <p className="text-xs text-muted mt-1.5">14-day full Pro trial • No credit card required</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full px-4 py-2.5 rounded-2xl border border-line text-xs text-ink bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                className="w-full px-4 py-2.5 rounded-2xl border border-line text-xs text-ink bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Company / Workspace Name</label>
              <input
                type="text"
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
                placeholder="e.g. Acme Studio"
                className="w-full px-4 py-2.5 rounded-2xl border border-line text-xs text-ink bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 rounded-2xl border border-line text-xs text-ink bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-muted hover:text-ink"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Bars */}
              {password && (
                <div className="mt-2">
                  <div className="grid grid-cols-4 gap-1 h-1.5 w-full">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full rounded-full transition-all duration-300 ${
                          strengthScore >= step
                            ? strengthScore === 1
                              ? 'bg-red-500'
                              : strengthScore === 2
                              ? 'bg-orange-500'
                              : strengthScore === 3
                              ? 'bg-yellow-500'
                              : 'bg-emerald-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-brand text-white text-xs font-bold hover:bg-[#4d36bd] transition-all shadow-md shadow-brand/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Setting up workspace...' : 'Create Free Account'}</span>
            </button>
          </form>

          {/* Badges */}
          <div className="mt-6 pt-5 border-t border-line flex items-center justify-around text-center text-[11px] text-muted">
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-success" /> SSL 256-bit</span>
            <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-success" /> Isolated Tenant</span>
            <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-success" /> MySQL Hostinger</span>
          </div>
        </motion.div>
      </main>

      <footer className="py-4 text-center text-xs text-muted">
        © 2026 QR Code Manager SaaS. All rights reserved.
      </footer>
    </div>
  );
}
