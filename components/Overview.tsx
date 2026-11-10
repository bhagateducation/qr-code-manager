"use client";
import { motion } from "framer-motion";
import { ArrowUpRight, BarChart3, Layers, Plus, QrCode, ScanLine, Users } from "lucide-react";
import { Ctx, Empty, QR, formatDateTime, itemMotion, listMotion } from "./ui";

export function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const share = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="meter">
      <div className="meter-row">
        <span>{label}</span>
        <span className="muted">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="meter-track" role="progressbar" aria-label={label} aria-valuenow={share} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className={`meter-fill ${share >= 100 ? "full" : ""}`} initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
      </div>
    </div>
  );
}

export default function Overview({ ctx, openStudio }: { ctx: Ctx; openStudio: (qr: QR | null) => void }) {
  const { data, go, canWrite } = ctx;
  const stats = [
    { label: "Total scans", value: data.scans, icon: ScanLine, tab: "analytics", tone: "#059669" },
    { label: "Active QR codes", value: data.active, icon: QrCode, tab: "codes", tone: "#2563eb" },
    { label: "Business systems", value: data.systems.length, icon: Layers, tab: "systems", tone: "#7c3aed" },
    { label: "Team members", value: data.members.length, icon: Users, tab: "team", tone: "#db2777" },
  ];
  const topMax = data.topCodes[0]?.scanCount || 1;
  return (
    <div className="page-stack">
      <motion.div className="welcome" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1>Welcome back, {data.user.name.split(" ")[0]}</h1>
          <p>
            {data.workspace.name} has {data.active} active {data.active === 1 ? "code" : "codes"} and {data.scans.toLocaleString()} total {data.scans === 1 ? "scan" : "scans"}.
          </p>
        </div>
        {canWrite && (
          <button className="button" onClick={() => openStudio(null)}>
            <Plus size={16} /> Create QR code
          </button>
        )}
        <QrCode className="welcome-art" size={150} strokeWidth={1.2} aria-hidden />
      </motion.div>
      <motion.div className="stats-grid" variants={listMotion} initial="hidden" animate="show">
        {stats.map((stat) => (
          <motion.button variants={itemMotion} whileHover={{ y: -3 }} className="stat" key={stat.label} onClick={() => go(stat.tab)} style={{ textAlign: "left", "--tone": stat.tone } as React.CSSProperties}>
            <span className="stat-label">
              {stat.label}
              <span className="stat-icon">
                <stat.icon size={16} />
              </span>
            </span>
            <strong>{stat.value.toLocaleString()}</strong>
          </motion.button>
        ))}
      </motion.div>

      <div className="two-col">
        <div className="page-stack">
          <div className="panel">
            <div className="panel-heading">
              <h2>Most scanned codes</h2>
              <button className="button small" onClick={() => go("analytics")}>
                <BarChart3 size={14} /> Analytics
              </button>
            </div>
            {data.topCodes.length ? (
              <div className="breakdown">
                {data.topCodes.map((code) => (
                  <div className="meter" key={code.id}>
                    <div className="meter-row">
                      <span className="truncate">{code.title}</span>
                      <span className="muted">{code.scanCount.toLocaleString()} scans</span>
                    </div>
                    <div className="meter-track">
                      <motion.div className="meter-fill" initial={{ width: 0 }} animate={{ width: `${(code.scanCount / topMax) * 100}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon={QrCode} title={data.total ? "No scans yet" : "Create your first QR code"} text={data.total ? "Print or share a code. Scans appear here as they happen." : "It takes less than a minute, and you can change the destination any time."}>
                {canWrite && !data.total && (
                  <button className="button primary" onClick={() => openStudio(null)}>
                    <Plus size={16} /> Create QR code
                  </button>
                )}
              </Empty>
            )}
          </div>
          <div className="panel flush">
            <div className="panel-heading">
              <h2>Recent scans</h2>
            </div>
            {data.logs.slice(0, 6).map((log) => (
              <div className="audit-row" key={log.id}>
                <span>
                  <ScanLine size={15} className="muted" />
                  <strong>{log.qrCode.title}</strong>
                  <small>
                    {log.device} · {log.os} · {log.browser}
                  </small>
                </span>
                <time>{formatDateTime(log.scannedAt)}</time>
              </div>
            ))}
            {!data.logs.length && <p className="empty">No scans recorded yet.</p>}
          </div>
        </div>

        <div className="page-stack">
          <div className="panel stack">
            <div className="panel-heading" style={{ marginBottom: 0 }}>
              <h2>Plan usage</h2>
              <span className="badge">{data.workspace.plan}</span>
            </div>
            <Meter label="QR codes" used={data.total} limit={data.limits.codes} />
            <Meter label="Systems" used={data.systems.length} limit={data.limits.systems} />
            <Meter label="Records" used={data.recordCount} limit={data.limits.records} />
            {data.workspace.plan !== "business" && (
              <button className="button" onClick={() => go("billing")}>
                See plans <ArrowUpRight size={15} />
              </button>
            )}
          </div>
          <div className="panel">
            <div className="panel-heading">
              <h2>Quick actions</h2>
            </div>
            <div className="quick-grid">
              {[
                { label: "New QR code", note: "Link, Wi-Fi, contact", icon: QrCode, run: () => openStudio(null), write: true, tone: "#2563eb" },
                { label: "New system", note: "Custom records", icon: Layers, run: () => go("systems"), write: true, tone: "#7c3aed" },
                { label: "Invite teammate", note: "Share the workspace", icon: Users, run: () => go("team"), tone: "#db2777" },
                { label: "View analytics", note: "Scans and devices", icon: BarChart3, run: () => go("analytics"), tone: "#059669" },
              ]
                .filter((item) => !item.write || canWrite)
                .map((item) => (
                  <button className="quick" key={item.label} onClick={item.run} style={{ "--tone": item.tone } as React.CSSProperties}>
                    <span className="stat-icon">
                      <item.icon size={16} />
                    </span>
                    <span>
                      {item.label}
                      <small>{item.note}</small>
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
