'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { QrCode, Lock, Mail, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simulate/Authenticate
      if (
        (email === 'owner@qrmanager.io' || email === 'admin@acme.com' || email.includes('@')) &&
        password.length >= 6
      ) {
        const session = {
          token: 'qrm_tok_' + Math.random().toString(36).substring(2),
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          user: {
            id: 'usr_001',
            name: email === 'admin@acme.com' ? 'Bhagat Education' : 'Rahul Kumar',
            email: email,
            role: email === 'admin@acme.com' ? 'admin' : 'owner',
            workspace: email === 'admin@acme.com' ? 'Bhagat Education' : 'Acme Corp',
          },
        };
        localStorage.setItem('qrm_session_v1', JSON.stringify(session));
        router.push('/dashboard');
      } else {
        setError('Invalid email or password. Password must be at least 6 characters.');
        setLoading(false);
      }
    } catch {
      setError('An error occurred during authentication.');
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col justify-between selection:bg-brand-soft selection:text-brand relative overflow-x-hidden">
      {/* Ambient Glowing Orbs */}
      <div className="fixed top-12 left-1/4 w-96 h-96 bg-brand/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-12 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

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
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand font-semibold hover:underline">
            Start free trial
          </Link>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="max-w-md w-full bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl p-7 sm:p-9 shadow-glass relative"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-soft text-brand mb-3 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-ink tracking-tight">Sign in to your account</h1>
            <p className="text-xs text-muted mt-1.5">Enter your credentials to access your QR workspaces</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-4 py-2.5 rounded-2xl border border-line text-xs text-ink bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-ink">Password</label>
                <a href="#" className="text-[11px] text-brand hover:underline font-medium">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-brand text-white text-xs font-bold hover:bg-[#4d36bd] transition-all shadow-md shadow-brand/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line" /></div>
            <span className="relative bg-white px-3 text-[11px] font-semibold text-muted uppercase tracking-wider">
              Quick Demo Fill
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => quickFill('owner@qrmanager.io')}
              className="py-2.5 px-3 rounded-2xl border border-line hover:border-brand bg-page text-xs font-semibold text-ink text-left transition-colors"
            >
              <div className="font-bold text-brand">Platform Owner</div>
              <div className="text-[10px] text-muted truncate">owner@qrmanager.io</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill('admin@acme.com')}
              className="py-2.5 px-3 rounded-2xl border border-line hover:border-brand bg-page text-xs font-semibold text-ink text-left transition-colors"
            >
              <div className="font-bold text-brand">Client Admin</div>
              <div className="text-[10px] text-muted truncate">admin@acme.com</div>
            </button>
          </div>
        </motion.div>
      </main>

      <footer className="py-4 text-center text-xs text-muted">
        © 2026 QR Code Manager SaaS. All rights reserved.
      </footer>
    </div>
  );
}
