'use client';

import { motion } from 'framer-motion';
import { Users, UserPlus, Shield, Mail, Key } from 'lucide-react';

export default function TeamTab() {
  const members = [
    { id: '1', name: 'Rahul Kumar', email: 'owner@qrmanager.io', role: 'Owner', workspace: 'Acme Corp', avatar: 'RK' },
    { id: '2', name: 'Bhagat Education', email: 'admin@acme.com', role: 'Admin', workspace: 'Bhagat Education', avatar: 'BE' },
    { id: '3', name: 'Sarah Jenkins', email: 'sarah@acme.com', role: 'Editor', workspace: 'Acme Corp', avatar: 'SJ' },
    { id: '4', name: 'David Chen', email: 'david@acme.com', role: 'Viewer', workspace: 'Acme Corp', avatar: 'DC' },
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
            <Users className="w-5 h-5 text-brand" />
            <span>Multi-Tenant Team & Role Permissions</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            Tenant-isolated client access with granular permissions (Owner, Admin, Editor, Viewer)
          </p>
        </div>
        <button className="px-5 py-2.5 rounded-2xl bg-brand text-white font-bold text-xs shadow-md shadow-brand/20 hover:bg-[#4d36bd] active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto">
          <UserPlus className="w-4 h-4" />
          <span>Invite Team Member</span>
        </button>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-line shadow-soft">
        <div className="divide-y divide-line">
          {members.map((member) => (
            <div key={member.id} className="py-4 flex items-center justify-between hover:bg-page/40 px-2 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {member.avatar}
                </div>
                <div>
                  <div className="font-bold text-xs text-ink">{member.name}</div>
                  <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {member.email}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-gray-700">{member.workspace}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  member.role === 'Owner'
                    ? 'bg-purple-100 text-purple-700'
                    : member.role === 'Admin'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
