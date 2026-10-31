'use client';

import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  Smartphone,
  Globe2,
  Calendar,
  Filter,
} from 'lucide-react';

export default function AnalyticsTab() {
  const scanLogs = [
    { id: '1', qr: 'Inventory Tag #402', country: '🇮🇳 India', city: 'Mumbai', device: 'iPhone 15 (iOS)', time: '2 mins ago' },
    { id: '2', qr: 'Restaurant Menu POS', country: '🇺🇸 United States', city: 'New York', device: 'Galaxy S24 (Android)', time: '8 mins ago' },
    { id: '3', qr: 'VIP Conference Pass', country: '🇬🇧 United Kingdom', city: 'London', device: 'Pixel 8 (Android)', time: '14 mins ago' },
    { id: '4', qr: 'Machinery Shield', country: '🇩🇪 Germany', city: 'Berlin', device: 'Chrome (Windows)', time: '29 mins ago' },
    { id: '5', qr: 'Inventory Tag #402', country: '🇮🇳 India', city: 'Bengaluru', device: 'iPad Pro (iPadOS)', time: '41 mins ago' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-line shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand" />
            <span>Deep Scan Analytics & Geolocation Telemetry</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            Real-time scanner hardware, operating system, and geographic distribution
          </p>
        </div>
        <button className="px-5 py-2.5 rounded-2xl bg-white border border-line hover:border-brand font-bold text-xs text-ink hover:text-brand shadow-sm flex items-center gap-2 self-start sm:self-auto">
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Distribution Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Device Breakdown */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft space-y-4">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand" />
            <span>Hardware Device Form Factor</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Mobile Smartphones</span>
                <span>78.4%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-brand h-full rounded-full w-[78%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Desktop Laptops / PCs</span>
                <span>15.8%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-400 h-full rounded-full w-[16%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Tablets & iPads</span>
                <span>5.8%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-300 h-full rounded-full w-[6%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Operating System */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft space-y-4">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-emerald-600" />
            <span>Operating System</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Apple iOS</span>
                <span>54.2%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-[54%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Google Android</span>
                <span>38.1%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-teal-400 h-full rounded-full w-[38%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Windows / macOS</span>
                <span>7.7%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-300 h-full rounded-full w-[8%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Countries */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft space-y-4">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-amber-600" />
            <span>Top Geographic Regions</span>
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-page">
              <span className="font-semibold text-ink">🇮🇳 India</span>
              <span className="font-mono text-muted">6,492 scans (44%)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-page">
              <span className="font-semibold text-ink">🇺🇸 United States</span>
              <span className="font-mono text-muted">4,120 scans (28%)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-page">
              <span className="font-semibold text-ink">🇬🇧 United Kingdom</span>
              <span className="font-mono text-muted">1,780 scans (12%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Scan Log Table */}
      <div className="p-6 rounded-3xl bg-white border border-line shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-ink">Live Incoming Scans (Edge Stream)</h3>
          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Real-time</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="pb-3 font-semibold">QR Code Scanned</th>
                <th className="pb-3 font-semibold">Origin Location</th>
                <th className="pb-3 font-semibold">Scanner Client Device</th>
                <th className="pb-3 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {scanLogs.map((log) => (
                <tr key={log.id} className="hover:bg-page/40 transition-colors">
                  <td className="py-3 font-bold text-ink">{log.qr}</td>
                  <td className="py-3 text-muted">{log.country} • {log.city}</td>
                  <td className="py-3 font-mono text-ink">{log.device}</td>
                  <td className="py-3 text-right text-muted">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
