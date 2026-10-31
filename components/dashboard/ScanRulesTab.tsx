'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Smartphone,
  Clock,
  Globe,
  Lock,
  Plus,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';

export default function ScanRulesTab() {
  const [deviceRuleActive, setDeviceRuleActive] = useState(true);
  const [scheduleRuleActive, setScheduleRuleActive] = useState(false);
  const [pinRuleActive, setPinRuleActive] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-line shadow-soft flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-ink tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-brand" />
            <span>Dynamic Scan Redirection & Conditional Routing</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            Route physical QR scanners to different destinations in real time based on device OS, schedule, or geographic region.
          </p>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rule 1: Device-Based Smart Routing */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-ink">Device OS Smart Routing</h3>
                <p className="text-[11px] text-muted">Detect iOS, Android, or Desktop browser</p>
              </div>
            </div>
            {/* Toggle */}
            <button
              onClick={() => setDeviceRuleActive(!deviceRuleActive)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                deviceRuleActive ? 'bg-brand' : 'bg-gray-200'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white block transition-transform absolute top-0.5 left-0.5 shadow-sm ${
                  deviceRuleActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-line text-xs">
            <div className="p-3 rounded-2xl bg-page border border-line flex items-center justify-between">
              <span className="font-semibold text-ink">Apple iOS Devices:</span>
              <span className="text-muted truncate max-w-[200px] font-mono">apps.apple.com/app/acme</span>
            </div>
            <div className="p-3 rounded-2xl bg-page border border-line flex items-center justify-between">
              <span className="font-semibold text-ink">Google Android Devices:</span>
              <span className="text-muted truncate max-w-[200px] font-mono">play.google.com/store/acme</span>
            </div>
            <div className="p-3 rounded-2xl bg-page border border-line flex items-center justify-between">
              <span className="font-semibold text-ink">Default / Desktop:</span>
              <span className="text-brand truncate max-w-[200px] font-mono">https://acme.com/portal</span>
            </div>
          </div>
        </div>

        {/* Rule 2: Time-of-Day / Schedule Routing */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-ink">Time-of-Day Schedule</h3>
                <p className="text-[11px] text-muted">Ideal for Restaurant Menus & Happy Hours</p>
              </div>
            </div>
            {/* Toggle */}
            <button
              onClick={() => setScheduleRuleActive(!scheduleRuleActive)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                scheduleRuleActive ? 'bg-brand' : 'bg-gray-200'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white block transition-transform absolute top-0.5 left-0.5 shadow-sm ${
                  scheduleRuleActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-line text-xs">
            <div className="p-3 rounded-2xl bg-page border border-line flex items-center justify-between">
              <span className="font-semibold text-ink">Lunch (11:00 AM – 3:00 PM):</span>
              <span className="text-muted truncate max-w-[180px] font-mono">/menu/lunch</span>
            </div>
            <div className="p-3 rounded-2xl bg-page border border-line flex items-center justify-between">
              <span className="font-semibold text-ink">Dinner (6:00 PM – 11:00 PM):</span>
              <span className="text-muted truncate max-w-[180px] font-mono">/menu/dinner</span>
            </div>
          </div>
        </div>

        {/* Rule 3: PIN / Password Protection */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-ink">PIN Gate Protection</h3>
                <p className="text-[11px] text-muted">Scanner must input 4-digit code to reveal</p>
              </div>
            </div>
            <button
              onClick={() => setPinRuleActive(!pinRuleActive)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                pinRuleActive ? 'bg-brand' : 'bg-gray-200'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white block transition-transform absolute top-0.5 left-0.5 shadow-sm ${
                  pinRuleActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-page border border-line text-xs space-y-2">
            <label className="font-semibold text-ink block">Access PIN Code</label>
            <input
              type="password"
              placeholder="••••"
              defaultValue="7492"
              maxLength={4}
              className="w-36 px-3 py-1.5 rounded-xl border border-line text-center text-sm font-mono tracking-widest bg-white"
            />
          </div>
        </div>

        {/* Rule 4: Geo-Targeting */}
        <div className="p-6 rounded-3xl bg-white border border-line shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-ink">Country / Region Routing</h3>
                <p className="text-[11px] text-muted">Serve native currency or language</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-brand bg-brand-soft px-2.5 py-0.5 rounded-full">
              Pro Feature
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-page border border-line text-xs text-muted">
            Scanners from India (IN) auto-route to INR checkout; United States (US) auto-route to USD checkout.
          </div>
        </div>
      </div>
    </motion.div>
  );
}
