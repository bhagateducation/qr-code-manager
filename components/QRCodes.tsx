"use client";
import { Fragment, useEffect, useState } from "react";
import {
  ArrowDownUp, ArrowUpRight, ChevronRight, ClipboardCopy, CopyPlus, Download, FileSpreadsheet, FileText, Folder as FolderIcon, FolderOpen, FolderPlus, GripVertical, Layers, ListVideo, Pause, Pencil, Play, Plus, Printer, QrCode, RotateCcw, Search, Settings2, Share2, Tag as TagIcon, Trash2, Upload, X,
} from "lucide-react";
import { PrintSheet } from "./Books";
import { BulkCodes, FileImport, FolderSettings, YouTubeImport } from "./Bulk";
import { Ctx, Empty, Filters, Info, Menu, QR, copyImage, downloadBlob, folderPath, folderTrail, formatDate, isWaiting, noFilters, qrNumber, qrPng, shareLink, useLabelPref, youtubeId } from "./ui";

const typeLabel: Record<string, string> = { dynamic_url: "Website link", wifi: "Wi-Fi", vcard: "Contact card", text: "Plain text" };
const TRASH_DAYS = 30;
type Tool = "bulk" | "youtube" | "import" | "settings" | null;

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
  const [withLabel, setWithLabel] = useLabelPref();
  const [search, setSearch] = useState(filters.search);
  const [selected, setSelected] = useState<string[]>([]);
  const [naming, setNaming] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [tool, setTool] = useState<Tool>(null);
  const [dragging, setDragging] = useState<{ kind: "qr" | "folder"; id: string } | null>(null);
  const inTrash = filters.status === "trash";
  const set = (patch: Partial<Filters>) => {
    setPage(1);
    setSelected([]);
    setFilters({ ...filters, ...patch });
  };
  // Opening a folder shows its codes in their manual order unless another sort was chosen.
  const openFolder = (id: string) => set({ folder: id, sort: filters.sort || "position" });
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
  const folder = data.folders.find((item) => item.id === filters.folder);
  const subfolders = data.folders.filter((item) => item.parentId === (folder?.id || null));
  const unfiled = data.codeCount - data.folders.reduce((sum, item) => sum + item._count.qrCodes, 0);
  // A folder's count includes everything filed beneath it.
  const deepCount = (id: string): number => data.folders.filter((item) => item.parentId === id).reduce((sum, item) => sum + deepCount(item.id), data.folders.find((item) => item.id === id)?._count.qrCodes || 0);
  async function addFolder() {
    if (!naming?.trim()) return;
    await mutate("folder.create", { name: naming.trim(), parentId: folder?.id || null }).then(() => setNaming(null), () => {});
  }
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const narrowed = filters.search || filters.tag || filters.type || (filters.status && !inTrash);
  // Manual order works inside one folder (or "Not in a folder") with nothing else narrowing the list.
  const ordering = canWrite && !inTrash && !!filters.folder && filters.sort === "position" && !narrowed;
  const allSelected = data.qrCodes.length > 0 && selected.length === data.qrCodes.length;
  const link = (qr: QR) => `${data.linkBase}/s/${qr.shortCode}`;
  const image = (qr: QR, width = 1024) => qrPng(!qr.type || qr.type === "dynamic_url" ? link(qr) : qr.targetUrl, qr.styling, withLabel ? { title: qr.title, number: qr.number } : null, width);
  const share = (qr: QR) =>
    navigator.clipboard
      .writeText(shareLink(data, qr))
      .then(() => notify("Share link copied. It opens a page showing this QR code."))
      .catch(() => notify("Copy is blocked by this browser.", "error"));
  async function download(qr: QR) {
    try {
      downloadBlob(await image(qr, 2048), `${qrNumber(qr.number)}-${qr.title.replace(/[^a-z0-9_-]/gi, "-").slice(0, 60)}.png`);
    } catch {
      notify("The image could not be generated. Open the code and try there.", "error");
    }
  }
  const copyQr = (qr: QR) =>
    copyImage(image(qr))
      .then(() => notify("QR image copied. Paste it anywhere."))
      .catch((e) => notify(e.message, "error"));
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
  const placeCode = (id: string, index: number) => mutate("qr.place", { index, folder: filters.folder }, id).catch(() => {});
  const placeFolder = (id: string, index: number) => mutate("folder.place", { index }, id).catch(() => {});
  const exportUrl = (kind: string) => `/api/workspace/export?kind=${kind}${folder ? `&folder=${folder.id}` : ""}`;
  const where = folder ? `“${folder.name}”` : "all folders";

  return (
    <div className="panel flush">
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input type="search" aria-label="Search QR codes" placeholder="Search name, number or link…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select aria-label="Show" value={filters.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">All {data.codeCount.toLocaleString()}</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="trash">Trash {data.trashCount ? `(${data.trashCount})` : ""}</option>
        </select>
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
          <option value="position">Manual order</option>
          <option value="oldest">Oldest first</option>
          <option value="number">Number, low to high</option>
          <option value="name">Name, A to Z</option>
          <option value="scans">Most scanned</option>
        </select>
        {narrowed && (
          <button className="icon-button" title="Clear filters" aria-label="Clear filters" onClick={() => clearFilters()}>
            <X size={16} />
          </button>
        )}
        <span className="grow" />
        {inTrash ? (
          isAdmin &&
          data.trashCount > 0 && (
            <button className="button danger" onClick={emptyTrash}>
              <Trash2 size={15} /> Empty trash
            </button>
          )
        ) : (
          <>
            <Menu label="Import / Export" icon={ArrowDownUp}>
              <span className="menu-label">Download {where}</span>
              <a href={exportUrl("xlsx")} download>
                <FileSpreadsheet size={15} /> Excel with QR images
              </a>
              <a href={exportUrl("docx")} download>
                <FileText size={15} /> Word with QR images
              </a>
              <a href="/api/workspace/export?kind=qr" download>
                <Download size={15} /> CSV of every code
              </a>
              {folder && (
                <button onClick={() => setPrinting(true)}>
                  <Printer size={15} /> Print sheet / PDF
                </button>
              )}
              {canWrite && (
                <>
                  <span className="menu-label">Bring codes in</span>
                  <button onClick={() => setTool("import")}>
                    <Upload size={15} /> Import Excel, Word or CSV
                  </button>
                </>
              )}
              <span className="menu-label">Images</span>
              <button onClick={() => setWithLabel(!withLabel)}>
                <TagIcon size={15} /> Name and number on images: {withLabel ? "On" : "Off"}
              </button>
            </Menu>
            {canWrite && (
              <Menu label="Add" icon={Plus} primary>
                <span className="menu-label">{folder ? `Inside ${folder.name}` : "Add"}</span>
                <button onClick={() => openStudio(null)}>
                  <QrCode size={15} /> One QR code
                </button>
                <button onClick={() => setTool("bulk")}>
                  <Layers size={15} /> Many codes (Q1, Q2…)
                </button>
                <button onClick={() => setTool("youtube")}>
                  <ListVideo size={15} /> From a YouTube playlist
                </button>
                <button onClick={() => setNaming("")}>
                  <FolderPlus size={15} /> New folder
                </button>
              </Menu>
            )}
          </>
        )}
      </div>

      {!inTrash && (
        <div className="toolbar folders">
          <button className="chip" aria-pressed={!filters.folder} onClick={() => set({ folder: "" })}>
            <FolderIcon size={13} /> All folders
          </button>
          {folderTrail(data.folders, folder?.id).map((item) => (
            <Fragment key={item.id}>
              <ChevronRight size={14} className="muted" />
              <button className="chip" aria-pressed={item.id === folder?.id} onClick={() => openFolder(item.id)}>
                {item.name}
              </button>
            </Fragment>
          ))}
          {filters.folder === "none" && (
            <>
              <ChevronRight size={14} className="muted" />
              <span className="chip" aria-pressed="true">
                Not in a folder
              </span>
            </>
          )}
          <span className="grow" />
          {naming !== null && (
            <form
              className="row-actions"
              style={{ flexWrap: "nowrap" }}
              onSubmit={(event) => {
                event.preventDefault();
                void addFolder();
              }}
            >
              <input autoFocus aria-label="New folder name" value={naming} maxLength={100} placeholder={folder ? `New folder inside ${folder.name}` : "New folder name"} onChange={(e) => setNaming(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setNaming(null)} style={{ minHeight: 30, padding: "2px 8px", width: 200 }} />
              <button className="button small primary">Add</button>
              <button type="button" className="icon-button" aria-label="Cancel" onClick={() => setNaming(null)}>
                <X size={15} />
              </button>
            </form>
          )}
          {folder && canWrite && (
            <button className="button small" onClick={() => setTool("settings")}>
              <Settings2 size={14} /> Folder settings
            </button>
          )}
        </div>
      )}
      {!inTrash && !filters.search && filters.folder !== "none" && (subfolders.length > 0 || (!folder && unfiled > 0)) && (
        <div className="folder-grid">
          {subfolders.map((item, index) => (
            <div
              key={item.id}
              className={`folder-tile ${item.kind === "book" ? "book" : ""} ${dragging?.id === item.id ? "dragging" : ""}`}
              draggable={canWrite}
              onDragStart={() => setDragging({ kind: "folder", id: item.id })}
              onDragEnd={() => setDragging(null)}
              onDragOver={(event) => dragging?.kind === "folder" && event.preventDefault()}
              onDrop={() => dragging?.kind === "folder" && dragging.id !== item.id && placeFolder(dragging.id, index + 1)}
            >
              <button className="folder-open" title={folderPath(data.folders, item.id)} onClick={() => openFolder(item.id)}>
                <FolderIcon strokeWidth={1.4} />
                <strong>{item.name}</strong>
                <small className="num">{deepCount(item.id).toLocaleString()} codes</small>
              </button>
            </div>
          ))}
          {!folder && unfiled > 0 && (
            <div className="folder-tile loose">
              <button className="folder-open" onClick={() => set({ folder: "none", sort: filters.sort || "position" })}>
                <FolderOpen strokeWidth={1.4} />
                <strong>Not in a folder</strong>
                <small className="num">{unfiled.toLocaleString()} codes</small>
              </button>
            </div>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="toolbar filters">
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
              <select aria-label="Move selected codes to a folder" value="" onChange={(e) => e.target.value && mutate("qr.bulk", { ids: selected, op: "move", folderId: e.target.value === "none" ? null : e.target.value }).then(() => setSelected([]), () => {})}>
                <option value="">Move to folder…</option>
                <option value="none">No folder</option>
                {data.folders.map((item) => (
                  <option key={item.id} value={item.id}>
                    {folderPath(data.folders, item.id)}
                  </option>
                ))}
              </select>
              <button className="button small danger" onClick={() => bulk("trash")}>
                <Trash2 size={14} /> Move to trash
              </button>
            </>
          )}
          <span className="grow" />
          <button className="button small" onClick={() => setSelected([])}>
            Clear selection
          </button>
        </div>
      )}
      {inTrash && data.trashCount > 0 && <p className="notice info flat">Trashed codes do not work when scanned. They are deleted for good {TRASH_DAYS} days after being trashed.</p>}
      {ordering && data.qrCodes.length > 1 && (
        <p className="notice info flat">
          Drag rows by <GripVertical size={13} style={{ verticalAlign: "-2px" }} /> or type a position number to change the order. Print sheets and exports follow this order.
        </p>
      )}

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
                {ordering && <th style={{ width: 86 }}>Order</th>}
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
              {data.qrCodes.map((qr, row) => {
                const place = (page - 1) * data.pageSize + row + 1;
                const video = youtubeId(qr.targetUrl);
                return (
                  <tr
                    key={qr.id}
                    className={dragging?.id === qr.id ? "dragging" : undefined}
                    onDragOver={(event) => ordering && dragging?.kind === "qr" && event.preventDefault()}
                    onDrop={() => ordering && dragging?.kind === "qr" && dragging.id !== qr.id && placeCode(dragging.id, place)}
                  >
                    {canWrite && (
                      <td className="pick">
                        <input type="checkbox" aria-label={`Select ${qr.title}`} checked={selected.includes(qr.id)} onChange={() => setSelected(selected.includes(qr.id) ? selected.filter((id) => id !== qr.id) : [...selected, qr.id])} />
                      </td>
                    )}
                    {ordering && (
                      <td data-label="Order">
                        <span className="order-cell">
                          <span className="grip" draggable onDragStart={() => setDragging({ kind: "qr", id: qr.id })} onDragEnd={() => setDragging(null)} title="Drag to reorder" aria-hidden>
                            <GripVertical size={16} />
                          </span>
                          <input
                            key={`${qr.id}-${place}`}
                            type="number"
                            min={1}
                            max={data.total}
                            aria-label={`Position of ${qr.title}`}
                            defaultValue={place}
                            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                            onBlur={(e) => Number(e.target.value) !== place && Number(e.target.value) >= 1 && placeCode(qr.id, Math.floor(Number(e.target.value)))}
                          />
                        </span>
                      </td>
                    )}
                    <td>
                      <button className="row-title" disabled={inTrash} style={{ opacity: 1, cursor: inTrash ? "default" : "pointer" }} onClick={() => openStudio(qr)}>
                        <span className="qr-tile" style={video ? { color: "#d93025" } : undefined}>
                          {video ? <ListVideo size={17} /> : <QrCode size={17} />}
                        </span>
                        <span className="grow">
                          {qr.title}
                          <small className="num">
                            {qrNumber(qr.number)}
                            {!filters.folder && qr.folderId ? ` · ${folderPath(data.folders, qr.folderId)}` : ""}
                            {qr.tags?.length ? ` · ${qr.tags.map((item) => item.tag.name).join(", ")}` : ""}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td data-label="Destination">
                      {!qr.type || qr.type === "dynamic_url" ? (
                        isWaiting(qr) ? (
                          <span className="badge neutral" title="Scans open this code's own page until you add a link.">
                            Link not added yet
                          </span>
                        ) : (
                          <a className="destination" href={qr.targetUrl} target="_blank" rel="noopener noreferrer">
                            <span>{qr.targetUrl.replace(/^https?:\/\/(www\.)?/, "")}</span>
                            <ArrowUpRight size={13} />
                          </a>
                        )
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
                      <div className="row-actions" style={{ flexWrap: "nowrap", justifyContent: "flex-end", gap: 4 }}>
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
                            <button className="button small" title="Copy the QR picture to paste in WhatsApp, Word or a design tool" onClick={() => copyQr(qr)}>
                              <ClipboardCopy size={14} /> <span className="label">Copy image</span>
                            </button>
                            <button className="button small" title="Copy a link to a page that shows this QR code" onClick={() => share(qr)}>
                              <Share2 size={14} /> <span className="label">Share</span>
                            </button>
                            <button className="icon-button" title="Download high-quality PNG (2048 px)" aria-label={`Download ${qr.title} as PNG`} onClick={() => download(qr)}>
                              <Download size={16} />
                            </button>
                            <button className="icon-button" title={canWrite ? "Edit" : "View"} aria-label={`Open ${qr.title}`} onClick={() => openStudio(qr)}>
                              <Pencil size={16} />
                            </button>
                            {canWrite && (
                              <button className="icon-button" title="Duplicate" aria-label={`Duplicate ${qr.title}`} onClick={() => void mutate("qr.duplicate", undefined, qr.id).catch(() => {})}>
                                <CopyPlus size={16} />
                              </button>
                            )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      ) : inTrash && !data.trashCount ? (
        <Empty icon={Trash2} title="The trash is empty" text={`Codes you delete wait here for ${TRASH_DAYS} days, so a mistake is easy to undo.`} />
      ) : (
        <Empty icon={QrCode} title={narrowed ? "No codes match these filters" : folder ? "This folder has no codes yet" : "No QR codes yet"} text={narrowed ? "Try a different word, or clear the filters." : "Add one code, many numbered codes, or a whole YouTube playlist."}>
          {narrowed ? (
            <button className="button" onClick={() => clearFilters()}>
              Clear filters
            </button>
          ) : (
            canWrite && (
              <div className="row-actions" style={{ justifyContent: "center" }}>
                <button className="button primary" onClick={() => openStudio(null)}>
                  <Plus size={16} /> One QR code
                </button>
                <button className="button" onClick={() => setTool("bulk")}>
                  <Layers size={16} /> Many codes
                </button>
                <button className="button" onClick={() => setTool("youtube")}>
                  <ListVideo size={16} /> YouTube playlist
                </button>
              </div>
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
          <small className="num">· {data.total.toLocaleString()} results</small>
          <Info text="Download in the row saves a 2048-pixel PNG, sharp at any print size up to about 17 cm. Open a code for 4096-pixel PNG or vector SVG." />
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

      {printing && folder && <PrintSheet folderId={folder.id} onClose={() => setPrinting(false)} notify={notify} label={withLabel} />}
      {tool === "bulk" && <BulkCodes ctx={ctx} folderId={folder?.id || ""} onClose={() => setTool(null)} />}
      {tool === "youtube" && <YouTubeImport ctx={ctx} folderId={folder?.id || ""} onClose={() => setTool(null)} />}
      {tool === "import" && <FileImport ctx={ctx} folderId={folder?.id || ""} onClose={() => setTool(null)} />}
      {tool === "settings" && folder && <FolderSettings ctx={ctx} folder={folder} onClose={() => setTool(null)} onDeleted={() => (setTool(null), set({ folder: folder.parentId || "" }))} />}
    </div>
  );
}
