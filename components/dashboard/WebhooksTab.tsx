'use client';

import { motion } from 'framer-motion';
import { Webhook, Plus, Key, Check, Copy, Shield } from 'lucide-react';
import { useState } from 'react';

export default function WebhooksTab() {
  const [copiedKey, setCopiedKey] = useState(false);

  const copyApiKey = () => {
    navigator.clipboard.writeText('qrm_live_sec_9f823a4b912c7d91e4f2');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-6"
    >
      <div className="p-6 rounded-3xl bg-white border border-line shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink tracking-tight flex items-center gap-2">
            <Webhook className="w-5 h-5 text-brand" />
            <span>Developer Webhooks & API Keys</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            Dispatch HMAC-SHA256 signed event notifications whenever QR codes are scanned or system records change.
          </p>
        </div>
        <button className="px-5 py-2.5 rounded-2xl bg-brand text-white font-bold text-xs shadow-md shadow-brand/20 hover:bg-[#4d36bd] active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Add Webhook Endpoint</span>
        </button>
      </div>

      {/* API Key Card */}
      <div className="p-6 rounded-3xl bg-white border border-line shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <Key className="w-4 h-4 text-brand" />
            <span>Production API Token</span>
          </h3>
          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            Active
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="password"
            readOnly
            value="qrm_live_sec_9f823a4b912c7d91e4f2"
            className="flex-1 px-4 py-2.5 rounded-2xl border border-line text-xs font-mono bg-page"
          />
          <button
            onClick={copyApiKey}
            className="px-4 py-2.5 rounded-2xl border border-line hover:border-brand font-bold text-xs text-ink hover:text-brand flex items-center gap-1.5 transition-colors"
          >
            {copiedKey ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
          </button>
        </div>
      </div>

      {/* Registered Webhooks Table */}
      <div className="p-6 rounded-3xl bg-white border border-line shadow-soft">
        <h3 className="font-bold text-sm text-ink mb-4">Active Endpoints</h3>
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-page border border-line flex items-center justify-between">
            <div>
              <div className="font-bold text-xs text-ink font-mono">https://api.acme.com/v1/qr-scans</div>
              <div className="text-[11px] text-muted mt-1 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-brand/10 text-brand font-semibold">scan.created</span>
                <span className="px-2 py-0.5 rounded bg-brand/10 text-brand font-semibold">record.updated</span>
                <span>• 99.8% delivery success</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              Healthy
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
