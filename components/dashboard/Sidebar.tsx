'use client';

import {
  LayoutDashboard,
  QrCode,
  Layers,
  SlidersHorizontal,
  BarChart3,
  Users,
  Webhook,
  CreditCard,
  LogOut,
  ChevronDown,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
  workspaceName?: string;
}

export default function Sidebar({
  currentTab,
  onSelectTab,
  onLogout,
  userName = 'Rahul Kumar',
  userEmail = 'owner@qrmanager.io',
  workspaceName = 'Acme Corp',
}: SidebarProps) {
  const navItems = [
    { id: 'overview', label: 'Overview & Velocity', icon: LayoutDashboard },
    { id: 'qr-studio', label: 'QR Code Studio', icon: QrCode },
    { id: 'systems', label: 'Universal Systems', icon: Layers },
    { id: 'scan-rules', label: 'Scan Routing Rules', icon: SlidersHorizontal },
    { id: 'analytics', label: 'Scan Telemetry', icon: BarChart3 },
    { id: 'team', label: 'Team & Permissions', icon: Users },
    { id: 'webhooks', label: 'API & Webhooks', icon: Webhook },
    { id: 'billing', label: 'Subscription Plan', icon: CreditCard },
  ];

  return (
    <aside className="w-64 bg-[#17161D] text-gray-300 min-h-screen flex flex-col justify-between p-4 border-r border-gray-800 flex-shrink-0">
      <div>
        {/* Workspace Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-bold shadow-md shadow-brand/30">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-sm text-white tracking-tight truncate">
              QR<span className="text-brand">Manager</span>
            </div>
            <div className="text-[11px] text-gray-400 truncate flex items-center gap-1">
              <span>{workspaceName}</span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Navigation Tab Links */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-3 py-1.5">
            Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand text-white shadow-md shadow-brand/25 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom User Profile & Logout */}
      <div className="pt-4 border-t border-gray-800">
        <div className="p-2.5 rounded-2xl bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand to-purple-400 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{userName}</div>
              <div className="text-[10px] text-gray-400 truncate">{userEmail}</div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
