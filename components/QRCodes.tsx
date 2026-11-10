"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Copy, Download, Pause, Pencil, Play, Plus, QrCode, RotateCcw, Search, Trash2, X } from "lucide-react";
import { Ctx, Empty, Filters, QR, formatDate, noFilters, qrNumber } from "./ui";

const typeLabel: Record<string, string> = { dynamic_url: "Website link", wifi: "Wi-Fi", vcard: "Contact card", text: "Plain text" };
const TRASH_DAYS = 30;

export default function QRCodes({
  ctx,
  page,
  setPage,
  filters,
  setFilters,
  openStudio,
}: {
  ctx: Ctx;
  page: number;
  setPage: (page: number) => void;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  openStudio: (qr: QR | null) => void;
}) {
  const { data, canWrite, isAdmin, mutate, notify, ask } = ctx;
  const [search, setSearch] = useState(filters.search);
  const [selected, setSelected] = useState<string[]>([]);
  const inTrash = filters.status === "trash";
  const set = (patch: Partial<Filters>) => {
    setPage(1);
    setSelected([]);
    setFilters({ ...filters, ...patch });
  };
  // Search as you type, but only ask the server once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => search !== filters.search && set({ search }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  useEffect(() => setSearch(filters.search), [filters.search]);
  // A selection only makes sense for the rows on screen.
  useEffect(() => setSelected((ids) => ids.filter((id) => data.qrCodes.some((qr) => qr.id === id))), [data.qrCodes]);

  // Clearing keeps you where you are (trash or not) and keeps your sort and page size.
  const clearFilters = () => (setSearch(""), set({ ...noFilters, sort: filters.sort, size: filters.size, status: inTrash ? "trash" : "" }));
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const narrowed = filters.search || filters.tag || filters.campaign || filters.type || (filters.status && !inTrash);
  const allSelected = data.qrCodes.length > 0 && selected.length === data.qrCodes.length;
  const link = (qr: QR) => `${data.appUrl}/s/${qr.shortCode}`;
  const copy = (qr: QR) =>
    navigator.clipboard
      .writeText(link(qr))
      .then(() => notify("QR link copied."))
      .catch(() => notify("Copy is blocked by this browser.", "error"));
  async function download(qr: QR) {
    try {
      const { default: QRCode } = await import("qrcode");
      const anchor = document.createElement("a");
      anchor.href = await QRCode.toDataURL(!qr.type || qr.type === "dynamic_url" ? link(qr) : qr.targetUrl, {
        width: 1024,
        margin: 4,
        errorCorrectionLevel: (qr.styling?.errorCorrectionLevel as "M") || "M",
        color: { dark: qr.styling?.dark || "#17161D", light: "#FFFFFF" },
      });
      anchor.download = `${qrNumber(qr.number)}-${qr.title.replace(/[^a-z0-9_-]/gi, "-").slice(0, 60)}.png`;
      anchor.click();
    } catch {
      notify("The image could not be generated. Open the code and try there.", "error");
    }
  }
  async function bulk(op: "pause" | "resume" | "trash" | "restore" | "purge", ids = selected) {
    const many = ids.length > 1 ? `${ids.length} codes` : "this code";
    if (op === "trash" && !(await ask({ title: `Move ${many} to the trash?`, body: `Trashed codes stop working when scanned. You can restore them for ${TRASH_DAYS} days.`, action: "Move to trash" }))) return;
    if (op === "purge" && !(await ask({ title: `Delete ${many} forever?`, body: "The codes and their scan history are removed permanently. Printed copies will never work again.", action: "Delete forever" }))) return;
    await mutate("qr.bulk", { ids, op }).catch(() => {});
    setSelected([]);
  }
  async function emptyTrash() {
    if (await ask({ title: "Empty the trash?", body: `All ${data.trashCount} trashed codes and their scan history are removed permanently.`, action: "Empty trash" })) await mutate("trash.empty").catch(() => {});
  }

  return (
    <div className="panel flush">
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input type="search" aria-label="Search QR codes" placeholder="Search by name, number or link…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="segmented" role="group" aria-label="Show">
          {[
            ["", `All ${data.codeCount.toLocaleString()}`],
            ["active", "Active"],
            ["paused", "Paused"],
            ["trash", `Trash ${data.trashCount || ""}`],
          ].map(([value, label]) => (
            <button key={value} aria-pressed={filters.status === value} onClick={() => set({ status: value })}>
              {label}
            </button>
          ))}
        </div>
        <span className="grow" />
        {inTrash
          ? isAdmin &&
            data.trashCount > 0 && (
              <button className="button danger" onClick={emptyTrash}>
                <Trash2 size={15} /> Empty trash
              </button>
            )
          : (
            <a className="button" href="/api/workspace/export?kind=qr" download>
              <Download size={15} /> <span className="hide-sm">Export CSV</span>
            </a>
          )}
      </div>

      <div className="toolbar filters">
        {selected.length ? (
          <>
            <strong className="num">{selected.length} selected</strong>
            {inTrash ? (
              <>
                <button className="button small" onClick={() => bulk("restore")}>
                  <RotateCcw size={14} /> Restore
                </button>
                {isAdmin && (
                  <button className="button small danger" onClick={() => bulk("purge")}>
                    <Trash2 size={14} /> Delete forever
                  </button>
                )}
              </>
            ) : (
              <>
                <button className="button small" onClick={() => bulk("pause")}>
                  <Pause size={14} /> Pause
                </button>
                <button className="button small" onClick={() => bulk("resume")}>
                  <Play size={14} /> Resume
                </button>
                <button className="button small danger" onClick={() => bulk("trash")}>
                  <Trash2 size={14} /> Move to trash
                </button>
              </>
            )}
            <button className="button small" onClick={() => setSelected([])}>
              Clear selection
            </button>
          </>
        ) : (
          <>
            {!inTrash && (
              <>
                <select aria-label="Type" value={filters.type} onChange={(e) => set({ type: e.target.value })}>
                  <option value="">All types</option>
                  {Object.entries(typeLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {data.campaigns.length > 0 && (
                  <select aria-label="Campaign" value={filters.campaign} onChange={(e) => set({ campaign: e.target.value })}>
                    <option value="">All campaigns</option>
                    {data.campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                )}
                {data.tags.length > 0 && (
                  <select aria-label="Tag" value={filters.tag} onChange={(e) => set({ tag: e.target.value })}>
                    <option value="">All tags</option>
                    {data.tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
            <select aria-label="Sort by" value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
              <option value="">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="number">Number, low to high</option>
              <option value="name">Name, A to Z</option>
              <option value="scans">Most scanned</option>
            </select>
            {narrowed && (
              <button className="button small" onClick={() => clearFilters()}>
                <X size={14} /> Clear filters
              </button>
            )}
            <span className="grow" />
            <small className="num">
              {data.total.toLocaleString()} {data.total === 1 ? "result" : "results"}
            </small>
          </>
        )}
      </div>
      {inTrash && data.trashCount > 0 && <p className="notice info flat">Trashed codes do not work when scanned. They are deleted for good {TRASH_DAYS} days after being trashed.</p>}

      {data.qrCodes.length ? (
        <div className="table-scroll">
          <table className="cards">
            <thead>
              <tr>
                {canWrite && (
                  <th style={{ width: 40 }}>
                    <input type="checkbox" aria-label="Select all on this page" checked={allSelected} onChange={() => setSelected(allSelected ? [] : data.qrCodes.map((qr) => qr.id))} />
                  </th>
                )}
                <th>QR code</th>
                <th>Destination</th>
                <th>{inTrash ? "Trashed" : "Status"}</th>
                <th>Scans</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.qrCodes.map((qr) => (
                <tr key={qr.id}>
                  {canWrite && (
                    <td className="pick">
                      <input type="checkbox" aria-label={`Select ${qr.title}`} checked={selected.includes(qr.id)} onChange={() => setSelected(selected.includes(qr.id) ? selected.filter((id) => id !== qr.id) : [...selected, qr.id])} />
                    </td>
                  )}
                  <td>
                    <button className="row-title" disabled={inTrash} style={{ opacity: 1, cursor: inTrash ? "default" : "pointer" }} onClick={() => openStudio(qr)}>
                      <span className="qr-tile">
                        <QrCode size={17} />
                      </span>
                      <span className="grow">
                        {qr.title}
                        <small className="num">
                          {qrNumber(qr.number)}
                          {qr.campaign ? ` · ${qr.campaign.name}` : ""}
                          {qr.tags?.length ? ` · ${qr.tags.map((item) => item.tag.name).join(", ")}` : ""}
                        </small>
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
                  <td data-label={inTrash ? "Trashed" : "Status"}>
                    {inTrash ? (
                      <small>{qr.deletedAt ? formatDate(qr.deletedAt) : ""}</small>
                    ) : canWrite ? (
                      <span className="row-actions" style={{ flexWrap: "nowrap" }}>
                        <button className="switch" role="switch" aria-checked={qr.isActive} aria-label={`${qr.title} is ${qr.isActive ? "active" : "paused"}`} onClick={() => void mutate("qr.pause", undefined, qr.id).catch(() => {})} />
                        <small>{qr.isActive ? "Active" : "Paused"}</small>
                      </span>
                    ) : (
                      <span className={`status ${qr.isActive ? "active" : ""}`}>{qr.isActive ? "Active" : "Paused"}</span>
                    )}
                  </td>
                  <td data-label="Scans" className="num">
                    {qr.scanCount.toLocaleString()}
                  </td>
                  <td className="actions">
                    <div className="row-actions" style={{ flexWrap: "nowrap", justifyContent: "flex-end", gap: 2 }}>
                      {inTrash ? (
                        canWrite && (
                          <>
                            <button className="button small" onClick={() => bulk("restore", [qr.id])}>
                              <RotateCcw size={14} /> Restore
                            </button>
                            {isAdmin && (
                              <button className="icon-button danger" title="Delete forever" aria-label={`Delete ${qr.title} forever`} onClick={() => bulk("purge", [qr.id])}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </>
                        )
                      ) : (
                        <>
                          <button className="icon-button" title="Copy QR link" aria-label={`Copy link for ${qr.title}`} onClick={() => copy(qr)}>
                            <Copy size={16} />
                          </button>
                          <button className="icon-button" title="Download PNG" aria-label={`Download ${qr.title} as PNG`} onClick={() => download(qr)}>
                            <Download size={16} />
                          </button>
                          <button className="icon-button" title={canWrite ? "Edit" : "View"} aria-label={`Open ${qr.title}`} onClick={() => openStudio(qr)}>
                            <Pencil size={16} />
                          </button>
                          {canWrite && (
                            <button className="icon-button danger" title="Move to trash" aria-label={`Move ${qr.title} to trash`} onClick={() => bulk("trash", [qr.id])}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : inTrash && !data.trashCount ? (
        <Empty icon={Trash2} title="The trash is empty" text={`Codes you delete wait here for ${TRASH_DAYS} days, so a mistake is easy to undo.`} />
      ) : (
        <Empty icon={QrCode} title={narrowed ? "No codes match these filters" : "No QR codes yet"} text={narrowed ? "Try a different word, or clear the filters." : "Create a code for a website, Wi-Fi network, contact card or text."}>
          {narrowed ? (
            <button className="button" onClick={() => clearFilters()}>
              Clear filters
            </button>
          ) : (
            canWrite && (
              <button className="button primary" onClick={() => openStudio(null)}>
                <Plus size={16} /> Create QR code
              </button>
            )
          )}
        </Empty>
      )}

      <div className="pagination">
        <label className="row-actions" style={{ fontWeight: 400 }}>
          Rows
          <select aria-label="Rows per page" value={filters.size} onChange={(e) => set({ size: e.target.value })} style={{ width: "auto", minHeight: 30, padding: "2px 8px", margin: 0 }}>
            <option>25</option>
            <option>50</option>
            <option>100</option>
          </select>
        </label>
        <div>
          <button className="button small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <label className="row-actions" style={{ fontWeight: 400 }}>
            Page
            <input
              key={page}
              type="number"
              aria-label="Go to page"
              min={1}
              max={pages}
              defaultValue={page}
              style={{ width: 64, minHeight: 30, padding: "2px 8px", margin: 0 }}
              onKeyDown={(e) => e.key === "Enter" && setPage(Math.min(pages, Math.max(1, Math.floor(Number(e.currentTarget.value)) || 1)))}
              onBlur={(e) => setPage(Math.min(pages, Math.max(1, Math.floor(Number(e.target.value)) || 1)))}
            />
            of {pages.toLocaleString()}
          </label>
          <button className="button small" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
