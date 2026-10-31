'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/dashboard/Sidebar';
import OverviewTab from '@/components/dashboard/OverviewTab';
import QRStudioTab from '@/components/dashboard/QRStudioTab';
import SystemBuilderTab from '@/components/dashboard/SystemBuilderTab';
import ScanRulesTab from '@/components/dashboard/ScanRulesTab';
import AnalyticsTab from '@/components/dashboard/AnalyticsTab';
import TeamTab from '@/components/dashboard/TeamTab';
import WebhooksTab from '@/components/dashboard/WebhooksTab';
import BillingTab from '@/components/dashboard/BillingTab';
import { Search, Bell, Sparkles, ExternalLink } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('overview');
  const [user, setUser] = useState({
    name: 'Rahul Kumar',
    email: 'owner@qrmanager.io',
    workspace: 'Acme Corp',
  });

  // Client-side authentication check
  useEffect(() => {
    try {
      const session = localStorage.getItem('qrm_session_v1');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.user) {
          setUser({
            name: parsed.user.name,
            email: parsed.user.email,
            workspace: parsed.user.workspace || 'Acme Corp',
          });
        }
      }
    } catch {}
  }, []);

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out of your executive workspace?')) {
      try {
        localStorage.removeItem('qrm_session_v1');
        sessionStorage.removeItem('qrm_session_v1');
      } catch {}
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-page flex font-sans antialiased">
      {/* 252px Dark Executive Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onLogout={handleLogout}
        userName={user.name}
        userEmail={user.email}
        workspaceName={user.workspace}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen overflow-y-auto">
        {/* Top Executive Header */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-line px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search schemas, QR codes, scan logs (⌘K)..."
                className="pl-9 pr-4 py-2 w-72 rounded-2xl border border-line text-xs bg-page focus:outline-none focus:border-brand focus:w-80 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-muted hover:text-brand flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-page transition-colors"
            >
              <span>Public Landing</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button className="p-2 rounded-xl text-muted hover:text-ink hover:bg-page transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-brand absolute top-1.5 right-1.5" />
            </button>

            <button
              onClick={() => setCurrentTab('qr-studio')}
              className="px-4 py-2 rounded-2xl bg-brand text-white font-bold text-xs shadow-md shadow-brand/20 hover:bg-[#4d36bd] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create QR</span>
            </button>
          </div>
        </header>

        {/* Tab View Container with Smooth AnimatePresence */}
        <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto flex-1">
          <AnimatePresence mode="wait">
            {currentTab === 'overview' && (
              <OverviewTab key="overview" onSwitchTab={setCurrentTab} />
            )}
            {currentTab === 'qr-studio' && <QRStudioTab key="qr-studio" />}
            {currentTab === 'systems' && <SystemBuilderTab key="systems" />}
            {currentTab === 'scan-rules' && <ScanRulesTab key="scan-rules" />}
            {currentTab === 'analytics' && <AnalyticsTab key="analytics" />}
            {currentTab === 'team' && <TeamTab key="team" />}
            {currentTab === 'webhooks' && <WebhooksTab key="webhooks" />}
            {currentTab === 'billing' && <BillingTab key="billing" />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
