"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, BarChart3, Check, Layers, QrCode, ScanLine, Users } from "lucide-react";
import { api, Ctx, Drive, Empty, QR, formatDateTime, limitText } from "./ui";

export function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const share = limit === null ? 0 : limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="meter">
      <div className="meter-row">
        <span>{label}</span>
        <span className="muted">
          {used.toLocaleString()} / {limitText(limit)}
        </span>
      </div>
      <div className="meter-track" role="progressbar" aria-label={label} aria-valuenow={share} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className={`meter-fill ${share >= 100 ? "full" : ""}`} initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div>
  );
}
const tone = (value: string) => ({ "--tone": value }) as React.CSSProperties;

export default function Overview({ ctx, openStudio }: { ctx: Ctx; openStudio: (qr: QR | null) => void }) {
  const { data, go, canWrite, isOwner } = ctx;
  const [week, setWeek] = useState<{ date: string; count: number }[] | null>(null);
  useEffect(() => {
    api(`/api/workspace/analytics?days=7&offset=${-new Date().getTimezoneOffset()}`)
      .then((report) => setWeek(report.daily))
      .catch(() => setWeek([]));
  }, []);

  const hour = new Date().getHours();
  const stats = [
    { label: "Total scans", value: data.scans, icon: ScanLine, tab: "analytics", tone: "var(--c-green)" },
    { label: "Active codes", value: data.active, icon: QrCode, tab: "codes", tone: "var(--c-blue)" },
    { label: "Systems", value: data.systems.length, icon: Layers, tab: "systems", tone: "var(--c-violet)" },
    { label: "Team members", value: data.members.length, icon: Users, tab: "team", tone: "var(--c-sky)" },
  ];
  // First-run guide: each step ticks itself off from real workspace data and the list disappears when done.
  const steps = [
    { label: "Create your first QR code", done: data.codeCount > 0, run: () => openStudio(null), show: canWrite },
    { label: "Get your first scan", done: data.scans > 0, run: () => go("codes"), show: true },
    { label: "Add a system for your records", done: data.systems.length > 0, run: () => go("systems"), show: canWrite },
    { label: "Invite a teammate", done: data.members.length > 1 || data.invitations.length > 0, run: () => go("team"), show: isOwner },
  ].filter((step) => step.show);
  const remaining = steps.filter((step) => !step.done).length;
  const peak = Math.max(...(week || []).map((day) => day.count), 1);
  const weekTotal = (week || []).reduce((sum, day) => sum + day.count, 0);
  const topMax = data.topCodes[0]?.scanCount || 1;

  return (
    <div className="page-stack">
      <div className="page-head" style={{ marginBottom: 4 }}>
        <div>
          <h1>
            Good {hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, {data.user.name.split(" ")[0]}
          </h1>
          <p className="muted">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <button className="stat" key={stat.label} onClick={() => go(stat.tab)}>
            <span className="stat-label">
              <span className="stat-icon" style={tone(stat.tone)}>
                <stat.icon size={14} />
              </span>
              {stat.label}
            </span>
            <strong>{stat.value.toLocaleString()}</strong>
          </button>
        ))}
      </div>

      <div className="two-col">
        <div className="page-stack">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Scans this week</h2>
                <p className="muted num">{weekTotal.toLocaleString()} in the last 7 days</p>
              </div>
              <button className="button small" onClick={() => go("analytics")}>
                <BarChart3 size={14} /> Open analytics
              </button>
            </div>
            {week === null ? (
              <div className="skeleton" style={{ height: 96 }} />
            ) : (
              <div className="bars mini" role="img" aria-label={`Scans per day for the last 7 days, ${weekTotal} in total`}>
                {week.map((day, index) => (
                  <div className="bar-col" key={day.date} title={`${day.date}: ${day.count} scans`}>
                    <motion.div className={`bar ${day.count ? "" : "zero"}`} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.45, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }} style={{ height: `${Math.max((day.count / peak) * 100, 3)}%` }} />
                    <small>{new Date(day.date).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" })}</small>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel" style={tone("var(--c-blue)")}>
            <div className="panel-heading">
              <h2>Most scanned codes</h2>
              <button className="button small" onClick={() => go("codes")}>
                All codes <ArrowUpRight size={14} />
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
                      <motion.div className="meter-fill" initial={{ width: 0 }} animate={{ width: `${(code.scanCount / topMax) * 100}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon={QrCode} title={data.codeCount ? "No scans yet" : "No codes yet"} text={data.codeCount ? "Print or share a code. Scans show up here within seconds." : "Create a code and it will appear here once it is scanned."} />
            )}
          </div>
        </div>

        <div className="page-stack">
          {remaining > 0 && (
            <div className="panel">
              <div className="panel-heading" style={{ marginBottom: 8 }}>
                <h2>Get set up</h2>
                <small className="num">
                  {steps.length - remaining} of {steps.length} done
                </small>
              </div>
              <div className="checklist">
                {steps.map((step) => (
                  <button key={step.label} className={`check-item ${step.done ? "done" : ""}`} onClick={step.run} disabled={step.done} style={{ opacity: 1 }}>
                    <span className="check-dot">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {step.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="panel stack">
            <div className="panel-heading" style={{ marginBottom: 0 }}>
              <h2>Plan usage</h2>
              <span className="badge">{data.workspace.planName}</span>
            </div>
            <div style={tone("var(--c-blue)")}>
              <Meter label="QR codes" used={data.usage.codes} limit={data.limits.codes} />
            </div>
            <div style={tone("var(--c-violet)")}>
              <Meter label="Systems" used={data.usage.systems} limit={data.limits.systems} />
            </div>
            <div style={tone("var(--c-pink)")}>
              <Meter label="Records" used={data.usage.records} limit={data.limits.records} />
            </div>
            <div>
              <Drive used={data.usage.storageBytes} limitMb={data.limits.storageMb} />
            </div>
          </div>
          <div className="panel flush">
            <div className="panel-heading">
              <h2>Latest scans</h2>
            </div>
            {data.logs.slice(0, 5).map((log) => (
              <div className="audit-row" key={log.id}>
                <span>
                  <strong className="truncate">{log.qrCode.title}</strong>
                  <small>
                    {log.os} · {log.browser}
                  </small>
                </span>
                <time>{formatDateTime(log.scannedAt)}</time>
              </div>
            ))}
            {!data.logs.length && <p className="empty">Nothing scanned yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
