"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Download, ScanLine } from "lucide-react";
import { api, Ctx, Empty, formatDateTime } from "./ui";

type Count = { label: string; count: number };
type Report = { days: number; total: number; capped: boolean; daily: { date: string; count: number }[]; heat: number[]; devices: Count[]; os: Count[]; browsers: Count[]; codes: Count[] };
const periods = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Breakdown({ title, rows, total }: { title: string; rows: Count[]; total: number }) {
  return (
    <div className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
      </div>
      <div className="breakdown">
        {rows.map((row) => (
          <div className="meter" key={row.label}>
            <div className="meter-row">
              <span className="truncate">{row.label}</span>
              <span className="muted">
                {row.count.toLocaleString()} · {Math.round((row.count / total) * 100)}%
              </span>
            </div>
            <div className="meter-track">
              <motion.div className="meter-fill" initial={{ width: 0 }} animate={{ width: `${(row.count / total) * 100}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
            </div>
          </div>
        ))}
        {!rows.length && <small>No data in this period.</small>}
      </div>
    </div>
  );
}

export default function Analytics({ ctx }: { ctx: Ctx }) {
  const { data, notify } = ctx;
  const [days, setDays] = useState(7);
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => {
    let active = true;
    api(`/api/workspace/analytics?days=${days}&offset=${-new Date().getTimezoneOffset()}`)
      .then((result) => active && setReport(result))
      .catch((e) => notify(e.message, "error"));
    return () => {
      active = false;
    };
  }, [days, notify]);

  const peak = Math.max(...(report?.daily.map((day) => day.count) || []), 1);
  const heatMax = Math.max(...(report?.heat || []), 0);
  const busiest = report?.daily.reduce((best, day) => (day.count > best.count ? day : best), { date: "", count: 0 });
  // Label roughly seven ticks whatever the range, so the axis never crowds on a phone.
  const tickEvery = Math.ceil((report?.daily.length || 1) / 7);
  return (
    <div className="page-stack">
      <div className="row-actions">
        <div className="segmented" role="group" aria-label="Period">
          {periods.map((period) => (
            <button key={period.days} aria-pressed={days === period.days} onClick={() => setDays(period.days)}>
              {period.label}
            </button>
          ))}
        </div>
        <span className="grow" />
        <a className="button" href="/api/workspace/export?kind=scans" download>
          <Download size={15} /> Export all scans
        </a>
      </div>
      {!report ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : (
        <>
          <div className="stats-grid">
            {[
              { label: "Scans in period", value: report.total.toLocaleString() + (report.capped ? "+" : "") },
              { label: "Daily average", value: (Math.round((report.total / report.days) * 10) / 10).toLocaleString() },
              { label: "Busiest day", value: busiest?.count ? new Date(busiest.date).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" }) : "—" },
              { label: "All-time scans", value: data.scans.toLocaleString() },
            ].map((stat) => (
              <div className="stat" key={stat.label}>
                <span className="stat-label">{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
          <div className="panel">
            <div className="panel-heading">
              <h2>
                <BarChart3 size={17} /> Scans per day
              </h2>
            </div>
            {report.total ? (
              <div className="bars" role="img" aria-label={`Scans per day for the last ${report.days} days. Peak ${peak}.`}>
                {report.daily.map((day, index) => (
                  <div className="bar-col" key={day.date} title={`${day.date}: ${day.count} scans`}>
                    <b>{report.daily.length <= 14 && day.count ? day.count : ""}</b>
                    <motion.div className={`bar ${day.count ? "" : "zero"}`} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4, delay: Math.min(index * 0.015, 0.4) }} style={{ height: `${Math.max((day.count / peak) * 100, 2)}%` }} />
                    <small>{index % tickEvery === 0 ? new Date(day.date).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" }) : " "}</small>
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon={ScanLine} title="No scans in this period" text="Share or print a code. Each scan is counted here within seconds." />
            )}
          </div>
          {report.total > 0 && (
            <>
              <div className="three-col">
                <Breakdown title="Top codes" rows={report.codes} total={report.total} />
                <Breakdown title="Operating system" rows={report.os} total={report.total} />
                <Breakdown title="Browser" rows={report.browsers} total={report.total} />
              </div>
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Busiest times</h2>
                    <p className="muted">Each cell is a two-hour window in your local time. Darker means more scans.</p>
                  </div>
                </div>
                <div className="heatmap">
                  <span />
                  {Array.from({ length: 12 }, (_, bucket) => (
                    <span key={bucket}>{bucket % 2 === 0 ? `${String(bucket * 2).padStart(2, "0")}h` : ""}</span>
                  ))}
                  {weekdays.map((day, row) => [
                    <span key={day}>{day}</span>,
                    ...report.heat.slice(row * 12, row * 12 + 12).map((count, bucket) => <span key={`${day}-${bucket}`} className={`heat heat-${heatMax ? Math.ceil((count / heatMax) * 4) : 0}`} title={`${day} ${bucket * 2}:00–${bucket * 2 + 2}:00 · ${count} scans`} />),
                  ])}
                </div>
              </div>
            </>
          )}
        </>
      )}
      <div className="panel flush">
        <div className="panel-heading">
          <h2>Latest scans</h2>
        </div>
        {data.logs.length ? (
          <div className="table-scroll">
            <table className="cards">
              <thead>
                <tr>
                  <th>QR code</th>
                  <th>Time</th>
                  <th>Device</th>
                  <th>System</th>
                  <th>Browser</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>{log.qrCode.title}</strong>
                    </td>
                    <td data-label="Time">{formatDateTime(log.scannedAt)}</td>
                    <td data-label="Device">{log.device}</td>
                    <td data-label="System">{log.os}</td>
                    <td data-label="Browser">{log.browser}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty">No scans recorded yet.</p>
        )}
      </div>
    </div>
  );
}
