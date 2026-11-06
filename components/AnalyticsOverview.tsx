"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Clock3,
  Download,
  KeyRound,
  Layers,
  PauseCircle,
  QrCode,
  Send,
  Smartphone,
  Users,
  Zap,
} from "lucide-react";

type ScanLog = {
  id: string;
  scannedAt: string;
  device: string;
  os: string;
  browser: string;
  qrCode: { title: string };
};

export type AnalyticsOverviewData = {
  logs: ScanLog[];
  scans: number;
  active: number;
  total: number;
  systems: { id: string }[];
  members: { id: string }[];
  workspace: { plan: string };
  webhookDeliveries: { id: string }[];
  invitations: { id: string }[];
  apiKeys: { id: string; revokedAt: string | null }[];
};

type Period = "today" | "7d" | "30d" | "month" | "all";

const periods: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "month", label: "This month" },
  { id: "all", label: "All captured" },
];

function periodStart(period: Period) {
  const now = new Date();
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (period === "30d") return new Date(now.getTime() - 30 * 86400000);
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

function formatDate(value: string | null) {
  if (!value) return "No scan data yet";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ratio(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export default function AnalyticsOverview({
  data,
  onExport,
}: {
  data: AnalyticsOverviewData;
  onExport: () => void;
}) {
  const [period, setPeriod] = useState<Period>("7d");
  const filteredLogs = useMemo(() => {
    const start = periodStart(period);
    if (!start) return data.logs;
    return data.logs.filter((log) => new Date(log.scannedAt) >= start);
  }, [data.logs, period]);

  const uniqueCodes = new Set(filteredLogs.map((log) => log.qrCode.title)).size;
  const mobileScans = filteredLogs.filter((log) => /mobile|tablet/i.test(log.device)).length;
  const browsers = new Set(filteredLogs.map((log) => log.browser).filter(Boolean)).size;
  const latestScan = filteredLogs[0]?.scannedAt ?? null;
  const paused = Math.max(data.total - data.active, 0);
  const activeKeys = data.apiKeys.filter((key) => !key.revokedAt).length;

  const dailyActivity = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return date;
    });
    return days.map((date) => ({
      label: date.toLocaleDateString("en-IN", { weekday: "short" }),
      count: filteredLogs.filter((log) => {
        const scanned = new Date(log.scannedAt);
        return scanned.toDateString() === date.toDateString();
      }).length,
    }));
  }, [filteredLogs]);

  const heatmap = useMemo(() => {
    const cells = Array.from({ length: 7 * 12 }, () => 0);
    filteredLogs.forEach((log) => {
      const date = new Date(log.scannedAt);
      const day = (date.getDay() + 6) % 7;
      const bucket = Math.min(11, Math.floor(date.getHours() / 2));
      cells[day * 12 + bucket] += 1;
    });
    const max = Math.max(...cells, 0);
    return { cells, max };
  }, [filteredLogs]);

  const stats = [
    { label: "Scans in period", value: filteredLogs.length, note: "Captured scan events", icon: BarChart3, tone: "mint", pill: filteredLogs.length ? "Live" : "No data" },
    { label: "Unique QR codes", value: uniqueCodes, note: "Codes with activity", icon: QrCode, tone: "blue", pill: `${ratio(uniqueCodes, data.active)}% active` },
    { label: "Active QR codes", value: data.active, note: `Of ${data.total.toLocaleString()} total codes`, icon: Zap, tone: "violet", pill: "Current" },
    { label: "Business systems", value: data.systems.length, note: "Configured data systems", icon: Layers, tone: "amber", pill: "Current" },
    { label: "Team members", value: data.members.length, note: "Workspace collaborators", icon: Users, tone: "lavender", pill: "Current" },
    { label: "Current plan", value: data.workspace.plan, note: "Workspace subscription", icon: CalendarDays, tone: "teal", pill: "Plan" },
    { label: "Paused QR codes", value: paused, note: "Not accepting scans", icon: PauseCircle, tone: "rose", pill: "Current" },
    { label: "Webhook deliveries", value: data.webhookDeliveries.length, note: "Delivery attempts recorded", icon: Send, tone: "orange", pill: "Captured" },
    { label: "Pending invites", value: data.invitations.length, note: "Team invitations waiting", icon: Users, tone: "pink", pill: "Current" },
    { label: "Active API keys", value: activeKeys, note: "Non-revoked credentials", icon: KeyRound, tone: "slate", pill: "Current" },
  ];

  return (
    <section className="analytics-overview" aria-labelledby="analytics-title">
      <div className="analytics-head">
        <div className="analytics-title-wrap">
          <span className="analytics-mark"><BarChart3 size={20} /></span>
          <div>
            <span className="eyebrow">Insights</span>
            <h2 id="analytics-title">Team analytics</h2>
            <p>Scan activity, response signals and workspace health in one view.</p>
          </div>
        </div>
        <button className="button analytics-export" onClick={onExport}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="analytics-filter" role="group" aria-label="Analytics period">
        {periods.map((item) => (
          <button
            type="button"
            key={item.id}
            className={period === item.id ? "active" : ""}
            aria-pressed={period === item.id}
            onClick={() => setPeriod(item.id)}
          >
            {item.label}
          </button>
        ))}
        <span className="analytics-filter-note"><Clock3 size={13} /> Based on captured scan logs</span>
      </div>

      <div className="analytics-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className={`analytics-card analytics-${stat.tone}`} key={stat.label}>
              <div className="analytics-card-label"><span>{stat.label}</span><span className="analytics-card-icon"><Icon size={16} /></span></div>
              <strong>{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</strong>
              <div className="analytics-card-footer"><small>{stat.note}</small><span>{stat.pill}</span></div>
            </article>
          );
        })}
      </div>

      <article className="analytics-summary panel">
        <div className="analytics-section-title"><div><span className="analytics-section-icon"><Zap size={17} /></span><div><h3>Scan activity health</h3><p>Fast operational signals from the selected window.</p></div></div><span className="analytics-live">{filteredLogs.length ? `${filteredLogs.length} captured` : "Waiting for first scan"}</span></div>
        <div className="analytics-summary-grid">
          <div><span>Latest scan</span><strong>{formatDate(latestScan)}</strong><small>Most recent captured event</small></div>
          <div><span>Mobile share</span><strong>{mobileScans ? `${ratio(mobileScans, filteredLogs.length)}%` : "—"}</strong><small>{mobileScans.toLocaleString()} mobile or tablet scans</small></div>
          <div><span>Unique browsers</span><strong>{browsers || "—"}</strong><small>Browser signatures observed</small></div>
          <div><span>Codes with activity</span><strong>{uniqueCodes || "—"}</strong><small>Distinct QR titles in logs</small></div>
        </div>
      </article>

      <div className="analytics-lower-grid">
        <article className="analytics-chart panel">
          <div className="analytics-section-title"><div><span className="analytics-section-icon analytics-violet"><Activity size={17} /></span><div><h3>Activity</h3><p>Daily scan events in the last 7 days.</p></div></div><span className="analytics-unit">events</span></div>
          <div className="activity-bars" aria-label="Daily scan activity">
            {dailyActivity.map((day) => {
              const max = Math.max(...dailyActivity.map((item) => item.count), 1);
              const height = day.count ? Math.max(10, Math.round((day.count / max) * 100)) : 3;
              return <div className="activity-bar-wrap" key={day.label}><span className="activity-value">{day.count || ""}</span><div className="activity-bar" style={{ height: `${height}%` }} title={`${day.label}: ${day.count} scans`} /><small>{day.label}</small></div>;
            })}
          </div>
          {!filteredLogs.length && <p className="analytics-empty">No scan data in this period. Scan a saved QR code to populate analytics.</p>}
        </article>
        <article className="analytics-heatmap panel">
          <div className="analytics-section-title"><div><span className="analytics-section-icon analytics-amber"><CalendarDays size={17} /></span><div><h3>Busiest times</h3><p>Two-hour windows from captured scans.</p></div></div><span className="analytics-unit">local time</span></div>
          <div className="heatmap-head"><span /><div>{[0, 4, 8, 12, 16, 20].map((hour) => <span key={hour}>{`${hour || 12}${hour < 12 ? "a" : "p"}`}</span>)}</div></div>
          <div className="heatmap-grid">
            {heatmap.cells.map((count, index) => {
              const day = Math.floor(index / 12);
              const bucket = index % 12;
              const intensity = heatmap.max ? Math.ceil((count / heatmap.max) * 4) : 0;
              return <span className={`heat-cell heat-${intensity}`} title={`${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day]} ${bucket * 2}:00 — ${count} scans`} key={`${day}-${bucket}`} />;
            })}
          </div>
          <div className="heatmap-days">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div>
          {!filteredLogs.length && <p className="analytics-empty">Heatmap will fill as scan events arrive.</p>}
        </article>
      </div>
    </section>
  );
}
