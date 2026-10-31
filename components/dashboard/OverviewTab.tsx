'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  QrCode,
  Layers,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  Globe,
  Clock,
} from 'lucide-react';

export default function OverviewTab({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  const kpis = [
    {
      title: 'Total Scans',
      value: '14,832',
      change: '+23% this month',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Active QR Codes',
      value: '247',
      change: '99.4% health score',
      icon: QrCode,
      color: 'text-brand',
      bg: 'bg-brand-soft',
    },
    {
      title: 'Business Systems',
      value: '8',
      change: '+2 schemas added',
      icon: Layers,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Functions Triggered',
      value: '1,204',
      change: 'Zero latency failures',
      icon: Zap,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  const recentQRs = [
    { id: '1', name: 'Inventory Asset Tag #402', system: 'Warehouse Pro', scans: 432, status: 'Active', updated: '12m ago' },
    { id: '2', name: 'Executive Suite Digital Menu', system: 'Restaurant POS', scans: 1894, status: 'Active', updated: '34m ago' },
    { id: '3', name: 'VIP Guest Conference Pass', system: 'Event Badge OS', scans: 89, status: 'Active', updated: '2h ago' },
    { id: '4', name: 'Equipment Warranty Shield', system: 'Machinery Fleet', scans: 512, status: 'Active', updated: '5h ago' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-6"
    >
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-brand via-[#7B66EA] to-[#9B88F5] text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Universal QR OS v2.0 • Online</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Acme Corp Executive Control Center
          </h2>
          <p className="mt-2 text-sm text-purple-100 max-w-xl leading-relaxed">
            All your dynamic routing rules, vector QR studios, custom schemas, and multi-tenant access in one unified dashboard.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => onSwitchTab('qr-studio')}
            className="px-5 py-3 rounded-2xl bg-white text-brand font-bold text-xs shadow-lg hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            <span>Create New QR</span>
          </button>
          <button
            onClick={() => onSwitchTab('systems')}
            className="px-5 py-3 rounded-2xl bg-white/15 text-white font-semibold text-xs border border-white/30 hover:bg-white/25 active:scale-95 transition-all"
          >
            <span>Add Business Schema</span>
          </button>
        </div>
        {/* Soft Background circles */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid with 3D Tilt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={idx}
              whileHover={{ y: -3, scale: 1.015 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-5 rounded-3xl bg-white border border-line shadow-soft hover:shadow-soft-hover transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center font-bold`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-success flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {kpi.change}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-ink tracking-tight">
                {kpi.value}
              </div>
              <div className="text-xs text-muted font-medium mt-1">
                {kpi.title}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Grid: Scan Velocity Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan Velocity Chart (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-line shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-ink text-base">30-Day Global Scan Velocity</h3>
              <p className="text-xs text-muted">Real-time edge scan redirection performance</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live: 42 scans/min
              </span>
            </div>
          </div>

          {/* SVG Animated Velocity Chart */}
          <div className="h-56 w-full pt-4">
            <svg viewBox="0 0 700 200" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B43D6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#5B43D6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="0" y1="40" x2="700" y2="40" stroke="#F0EFF3" strokeWidth="1" />
              <line x1="0" y1="100" x2="700" y2="100" stroke="#F0EFF3" strokeWidth="1" />
              <line x1="0" y1="160" x2="700" y2="160" stroke="#F0EFF3" strokeWidth="1" />

              {/* Area Fill */}
              <path
                d="M0,150 C70,120 120,160 190,80 C260,90 320,50 380,70 C440,90 500,30 570,40 C630,50 670,20 700,25 L700,200 L0,200 Z"
                fill="url(#chartGrad)"
              />

              {/* Stroke Line */}
              <path
                d="M0,150 C70,120 120,160 190,80 C260,90 320,50 380,70 C440,90 500,30 570,40 C630,50 670,20 700,25"
                fill="none"
                stroke="#5B43D6"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Interactive Data Point */}
              <circle cx="570" cy="40" r="5" fill="#5B43D6" stroke="#FFFFFF" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-line text-xs text-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand" />
                Scans Volume
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Target Conversions
              </span>
            </div>
            <span>Average Edge Latency: <strong>32ms</strong></span>
          </div>
        </div>

        {/* Security & Health Card (1 col) */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-ink text-base">Platform Health</h3>
              <ShieldCheck className="w-5 h-5 text-success" />
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-page border border-line">
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <span>Hostinger MySQL Link</span>
                  <span className="text-success">Connected</span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-success h-full rounded-full w-full" />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-page border border-line">
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <span>Dynamic QR Decodability</span>
                  <span className="text-brand">100% Passed</span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-brand h-full rounded-full w-full" />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-page border border-line">
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <span>SSL & Security Headers</span>
                  <span className="text-success">A+ Grade</span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-success h-full rounded-full w-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-line text-center">
            <button
              onClick={() => onSwitchTab('scan-rules')}
              className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Dynamic Redirection Rules</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent QR Codes Table */}
      <div className="p-6 rounded-3xl bg-white border border-line shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-ink text-base">Active Dynamic QR Codes</h3>
            <p className="text-xs text-muted">Directly routed to current destination targets</p>
          </div>
          <button
            onClick={() => onSwitchTab('qr-studio')}
            className="text-xs font-bold text-brand hover:underline"
          >
            Open QR Studio &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="pb-3 font-semibold">QR Name & Shortcode</th>
                <th className="pb-3 font-semibold">Attached System</th>
                <th className="pb-3 font-semibold">Scan Velocity</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Last Activity</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recentQRs.map((qr) => (
                <tr key={qr.id} className="hover:bg-page/50 transition-colors">
                  <td className="py-3.5 font-bold text-ink flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-brand-soft text-brand flex items-center justify-center font-bold">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <span>{qr.name}</span>
                  </td>
                  <td className="py-3.5 text-muted">{qr.system}</td>
                  <td className="py-3.5 font-mono font-semibold text-ink">{qr.scans.toLocaleString()} scans</td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                      {qr.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-muted">{qr.updated}</td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => onSwitchTab('qr-studio')}
                      className="px-3 py-1.5 rounded-xl border border-line hover:border-brand hover:text-brand font-semibold transition-colors"
                    >
                      Edit Payload
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
