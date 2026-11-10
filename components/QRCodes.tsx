"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Copy, Download, Pause, Pencil, Play, Plus, QrCode, Search, Trash2 } from "lucide-react";
import { Ctx, Empty, QR } from "./ui";

const typeLabel: Record<string, string> = { wifi: "Wi-Fi network", vcard: "Contact card", text: "Plain text" };

export default function QRCodes({
  ctx,
  page,
  setPage,
  query,
  setQuery,
  openStudio,
}: {
  ctx: Ctx;
  page: number;
  setPage: (page: number) => void;
  query: string;
  setQuery: (query: string) => void;
  openStudio: (qr: QR | null) => void;
}) {
  const { data, canWrite, mutate, notify, ask } = ctx;
  const [search, setSearch] = useState(query);
  // Search as you type, but only hit the server once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== query) {
        setPage(1);
        setQuery(search);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, query, setPage, setQuery]);

  const link = (qr: QR) => `${data.appUrl}/s/${qr.shortCode}`;
  async function remove(qr: QR) {
    if (await ask({ title: `Delete “${qr.title}”?`, body: "Printed copies of this code will stop working and its scan history is removed. This cannot be undone.", action: "Delete code" }))
      await mutate("qr.delete", undefined, qr.id).catch(() => {});
  }
  return (
    <div className="panel flush">
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input type="search" aria-label="Search QR codes" placeholder="Search codes by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="grow" />
        <a className="button" href="/api/workspace/export?kind=qr" download>
          <Download size={15} /> Export CSV
        </a>
      </div>
      {data.qrCodes.length ? (
        <div className="table-scroll">
          <table className="cards">
            <thead>
              <tr>
                <th>QR code</th>
                <th>Destination</th>
                <th>Status</th>
                <th>Scans</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.qrCodes.map((qr) => (
                <tr key={qr.id}>
                  <td>
                    <button className="row-title" onClick={() => openStudio(qr)}>
                      <span className="qr-tile">
                        <QrCode size={18} />
                      </span>
                      <span className="grow">
                        {qr.title}
                        <small>{qr.campaign?.name || qr.tags?.map((item) => item.tag.name).join(", ") || `/${qr.shortCode}`}</small>
                      </span>
                    </button>
                  </td>
                  <td data-label="Destination">
                    {!qr.type || qr.type === "dynamic_url" ? (
                      <a className="destination" href={qr.targetUrl} target="_blank" rel="noopener noreferrer">
                        <span>{qr.targetUrl.replace(/^https?:\/\//, "")}</span>
                        <ArrowUpRight size={13} />
                      </a>
                    ) : (
                      <span className="badge neutral">{typeLabel[qr.type]}</span>
                    )}
                  </td>
                  <td data-label="Status">
                    <span className={`status ${qr.isActive ? "active" : ""}`}>{qr.isActive ? "Active" : "Paused"}</span>
                  </td>
                  <td data-label="Scans">{qr.scanCount.toLocaleString()}</td>
                  <td className="actions">
                    <div className="row-actions" style={{ flexWrap: "nowrap", justifyContent: "flex-end", gap: 2 }}>
                      <button
                        className="icon-button"
                        title="Copy QR link"
                        aria-label={`Copy link for ${qr.title}`}
                        onClick={() =>
                          navigator.clipboard
                            .writeText(link(qr))
                            .then(() => notify("QR link copied."))
                            .catch(() => notify("Copy is blocked by this browser.", "error"))
                        }
                      >
                        <Copy size={16} />
                      </button>
                      <button className="icon-button" title={canWrite ? "Edit and download" : "View and download"} aria-label={`Open ${qr.title}`} onClick={() => openStudio(qr)}>
                        <Pencil size={16} />
                      </button>
                      {canWrite && (
                        <>
                          <button className="icon-button" title={qr.isActive ? "Pause" : "Resume"} aria-label={`${qr.isActive ? "Pause" : "Resume"} ${qr.title}`} onClick={() => void mutate("qr.pause", undefined, qr.id).catch(() => {})}>
                            {qr.isActive ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          <button className="icon-button danger" title="Delete" aria-label={`Delete ${qr.title}`} onClick={() => remove(qr)}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon={QrCode} title={query ? "No codes match your search" : "No QR codes yet"} text={query ? "Try a different name." : "Create a code for a website, Wi-Fi network, contact card or text."}>
          {canWrite && !query && (
            <button className="button primary" onClick={() => openStudio(null)}>
              <Plus size={16} /> Create QR code
            </button>
          )}
        </Empty>
      )}
      <div className="pagination">
        <span>
          {data.total.toLocaleString()} {data.total === 1 ? "code" : "codes"} {query ? "found" : `· ${data.limits.codes.toLocaleString()} allowed on your plan`}
        </span>
        <div>
          <button className="button small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {Math.max(1, Math.ceil(data.total / 25))}
          </span>
          <button className="button small" disabled={page * 25 >= data.total} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
