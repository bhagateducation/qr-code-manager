'use client';

import { motion } from 'framer-motion';
import { CreditCard, Check, Zap } from 'lucide-react';

export default function BillingTab() {
  const plans = [
    {
      name: 'Starter',
      price: '$0',
      period: 'forever',
      features: ['1 Business System', '50 Dynamic QR Codes', '1,000 monthly scans', 'Basic analytics'],
      current: false,
    },
    {
      name: 'Professional',
      price: '$29',
      period: 'month',
      features: ['10 Business Systems', '1,000 Dynamic QR Codes', '50,000 monthly scans', 'Device & geo scan routing', '300 DPI Vector PDF export'],
      current: true,
      popular: true,
    },
    {
      name: 'Enterprise Agency',
      price: '$89',
      period: 'month',
      features: ['Unlimited Systems', 'Unlimited Dynamic QRs', '500,000+ high-speed scans', 'Multi-tenant client portals', 'Custom public scan domain', 'Dedicated SLA support'],
      current: false,
    },
  ];

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
            <CreditCard className="w-5 h-5 text-brand" />
            <span>Workspace Subscription & Plan Quota</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            Current active plan: <strong className="text-brand font-bold">Professional Pro ($29/mo)</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`p-6 rounded-3xl bg-white border flex flex-col justify-between relative ${
              plan.current
                ? 'border-2 border-brand shadow-xl ring-2 ring-brand/10'
                : 'border-line shadow-soft'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                Active Plan
              </span>
            )}
            <div>
              <h3 className="font-bold text-lg text-ink">{plan.name}</h3>
              <div className="flex items-baseline gap-1 my-4">
                <span className="text-3xl font-extrabold text-ink">{plan.price}</span>
                <span className="text-xs text-muted">/{plan.period}</span>
              </div>
              <ul className="space-y-2.5 text-xs text-ink border-t border-line pt-4">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              disabled={plan.current}
              className={`mt-6 w-full py-2.5 rounded-2xl font-bold text-xs transition-all ${
                plan.current
                  ? 'bg-page text-muted cursor-not-allowed border border-line'
                  : 'bg-brand text-white shadow-md shadow-brand/20 hover:bg-[#4d36bd] active:scale-95'
              }`}
            >
              {plan.current ? 'Current Plan' : 'Upgrade Plan'}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
