"use client";
import { FormEvent, useState } from "react";
import { Download, FileSpreadsheet, FileText, ListVideo, Trash2 } from "lucide-react";
import FolderPicker from "./FolderPicker";
import { Ctx, Folder, Info, Modal, api, folderPath, plural } from "./ui";

type Row = { number?: number; title: string; url?: string; folder?: string };

/** Sends rows 250 at a time so each request stays small; a failure says how far it got. */
async function importRows(ctx: Ctx, rows: Row[], folderId: string) {
  let done = 0;
  try {
    for (let i = 0; i < rows.length; i += 250) {
      await api("/api/workspace", { action: "qr.import", data: { folderId: folderId || null, rows: rows.slice(i, i + 250) } });
      done += Math.min(250, rows.length - i);
    }
    ctx.notify(`${plural(done, "code")} imported.`);
    return true;
  } catch (e) {
    ctx.notify(`${(e as Error).message} ${done} of ${rows.length} rows were imported before this.`, "error");
    return false;
  } finally {
    await ctx.reload();
  }
}

/** Many numbered codes at once inside a folder, e.g. questions 21 to 40 of a chapter. */
export function BulkCodes({ ctx, folderId, onClose }: { ctx: Ctx; folderId: string; onClose: () => void }) {
  const { data, mutate } = ctx;
  const [folder, setFolder] = useState(folderId);
  const inside = data.folders.find((item) => item.id === folder);
  const next = (inside?._count.qrCodes || 0) + 1;
  const [form, setForm] = useState({ start: next, count: 10, title: "Q{n}", urlTemplate: "" });
  const [busy, setBusy] = useState(false);
  const left = data.limits.codes === null ? Infinity : data.limits.codes - data.usage.codes;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    await mutate("codes.bulk", { ...form, folderId: folder || null }).then(onClose, () => {});
    setBusy(false);
  }
  return (
    <Modal title="Add many codes" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <label>
          Folder
          <FolderPicker ctx={ctx} value={folder} onChange={setFolder} />
        </label>
        <div className="form-grid">
          <label>
            Start at number
            <input type="number" min={0} max={100000} required value={form.start} onChange={(e) => setForm({ ...form, start: Number(e.target.value) })} />
          </label>
          <label>
            How many
            <input type="number" min={1} max={1000} required value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} />
          </label>
        </div>
        <label>
          Name of each code
          <Info text="{n} becomes the number of each code: Q{n} gives Q21, Q22, Q23…" />
          <input required maxLength={90} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label>
          Link for each code (optional)
          <Info text="Write the link once with {n} where the number goes, e.g. https://example.com/maths/3/{n}. Leave it empty to add links later: until then each code opens its own QR page, never an error." />
          <input maxLength={1500} placeholder={`${data.linkBase.replace(/^https?:\/\//, "https://")}/… {n}`} value={form.urlTemplate} onChange={(e) => setForm({ ...form, urlTemplate: e.target.value })} />
        </label>
        <small className="muted">
          Creates {form.title.includes("{n}") ? form.title.replaceAll("{n}", String(form.start)) : `${form.title} ${form.start}`} to {form.title.includes("{n}") ? form.title.replaceAll("{n}", String(form.start + form.count - 1)) : `${form.title} ${form.start + form.count - 1}`}
          {inside ? ` in ${folderPath(data.folders, inside.id)}` : " (not in a folder)"}.
        </small>
        <button className="button primary" disabled={busy || form.count > left || form.count < 1}>
          {busy ? "Creating…" : form.count > left ? "More than your plan has left" : `Create ${plural(form.count || 0, "code")}`}
        </button>
      </form>
    </Modal>
  );
}

/** One dynamic code per video of a public YouTube playlist, named after each video, in a folder. */
export function YouTubeImport({ ctx, folderId, onClose }: { ctx: Ctx; folderId: string; onClose: () => void }) {
  const [link, setLink] = useState("");
  const [list, setList] = useState<{ title: string; partial: boolean; videos: { id: string; title: string; pick: boolean }[] } | null>(null);
  const [folder, setFolder] = useState(folderId);
  const [newFolder, setNewFolder] = useState(true);
  const [busy, setBusy] = useState(false);
  async function load(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api(`/api/workspace/youtube?list=${encodeURIComponent(link)}`);
      setList({ ...result, videos: result.videos.map((video: { id: string; title: string }) => ({ ...video, pick: true })) });
    } catch (e) {
      ctx.notify((e as Error).message, "error");
    }
    setBusy(false);
  }
  const picked = list?.videos.filter((video) => video.pick) || [];
  async function create() {
    if (!list) return;
    setBusy(true);
    // A new folder named after the playlist keeps every video together, in playlist order.
    const rows = picked.map((video, index) => ({ title: `${index + 1}. ${video.title}`.slice(0, 100), url: `https://www.youtube.com/watch?v=${video.id}`, folder: newFolder ? list.title.replaceAll("/", "-").slice(0, 100) : undefined }));
    if (await importRows(ctx, rows, folder)) onClose();
    setBusy(false);
  }
  return (
    <Modal title="Codes from a YouTube playlist" onClose={onClose} wide>
      <div className="stack">
        <form className="inline-form" onSubmit={load}>
          <label className="grow">
            Playlist link
            <input required value={link} placeholder="https://www.youtube.com/playlist?list=…" onChange={(e) => setLink(e.target.value)} />
          </label>
          <button className="button primary" disabled={busy}>
            <ListVideo size={15} /> {busy && !list ? "Reading…" : "Get videos"}
          </button>
        </form>
        {list && (
          <>
            <div className="row-actions">
              <strong className="grow truncate">
                {list.title} · {plural(list.videos.length, "video")}
              </strong>
              <button type="button" className="button small" onClick={() => setList({ ...list, videos: list.videos.map((video) => ({ ...video, pick: picked.length !== list.videos.length })) })}>
                {picked.length === list.videos.length ? "Untick all" : "Tick all"}
              </button>
            </div>
            {list.partial && <p className="notice info flat">YouTube showed the first {list.videos.length} videos. For longer playlists, add a YOUTUBE_API_KEY to the server settings.</p>}
            <div className="pick-list">
              {list.videos.map((video, index) => (
                <label key={video.id} className="toggle-row">
                  <input type="checkbox" checked={video.pick} onChange={() => setList({ ...list, videos: list.videos.map((item) => (item.id === video.id ? { ...item, pick: !item.pick } : item)) })} />
                  <span className="muted num">{index + 1}</span>
                  <input aria-label={`Name for video ${index + 1}`} value={video.title} maxLength={95} onChange={(e) => setList({ ...list, videos: list.videos.map((item) => (item.id === video.id ? { ...item, title: e.target.value } : item)) })} />
                </label>
              ))}
            </div>
            <label>
              Put the codes in
              <FolderPicker ctx={ctx} value={folder} onChange={setFolder} />
            </label>
            <label className="toggle-row">
              <input type="checkbox" checked={newFolder} onChange={(e) => setNewFolder(e.target.checked)} />
              Make a folder named “{list.title}” for them
            </label>
            <button className="button primary" disabled={busy || !picked.length} onClick={create}>
              {busy ? "Creating…" : `Create ${plural(picked.length, "code")}`}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Import from CSV, Excel or Word in the downloadable format. */
export function FileImport({ ctx, folderId, onClose }: { ctx: Ctx; folderId: string; onClose: () => void }) {
  const [folder, setFolder] = useState(folderId);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  async function read(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/workspace/import", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The file could not be read.");
      setRows(result.rows);
    } catch (e) {
      ctx.notify((e as Error).message, "error");
    }
    setBusy(false);
  }
  const updates = rows?.filter((row) => row.number).length || 0;
  return (
    <Modal title="Import codes" onClose={onClose}>
      <div className="stack">
        <p className="muted">Fill the format in Excel or Word (or a CSV) and upload it. Each row becomes a QR code. Rows with an existing QR number update that code's title and link instead, so you can export, edit links and import back.</p>
        <div className="row-actions">
          <a className="button small" href="/api/workspace/export?kind=template-xlsx" download>
            <FileSpreadsheet size={14} /> Excel format
          </a>
          <a className="button small" href="/api/workspace/export?kind=template-docx" download>
            <FileText size={14} /> Word format
          </a>
        </div>
        <label>
          Import into
          <Info text="Folders named in the file are created inside this folder. Choose no folder to create them at the top." />
          <FolderPicker ctx={ctx} value={folder} onChange={setFolder} />
        </label>
        <label className="button block" style={{ cursor: "pointer" }}>
          <Download size={15} /> {busy && !rows ? "Reading…" : rows ? "Choose another file" : "Choose file (.xlsx, .docx or .csv)"}
          <input type="file" hidden accept=".xlsx,.docx,.csv" onChange={(e) => (e.target.files?.[0] && read(e.target.files[0]), (e.target.value = ""))} />
        </label>
        {rows && (
          <>
            <p className="notice info flat">
              {plural(rows.length - updates, "new code")}
              {updates ? `, ${plural(updates, "update")}` : ""}. First row: “{rows[0].title}”.
            </p>
            <button className="button primary" disabled={busy} onClick={async () => (setBusy(true), (await importRows(ctx, rows, folder)) && onClose(), setBusy(false))}>
              {busy ? "Importing…" : "Import now"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Rename a folder, set its place among its neighbours, or delete it. */
export function FolderSettings({ ctx, folder, onClose, onDeleted }: { ctx: Ctx; folder: Folder; onClose: () => void; onDeleted: () => void }) {
  const { data, mutate, ask } = ctx;
  const siblings = data.folders.filter((item) => item.parentId === folder.parentId);
  const [name, setName] = useState(folder.name);
  const [place, setPlace] = useState(siblings.findIndex((item) => item.id === folder.id) + 1);
  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      if (name.trim() !== folder.name) await mutate("folder.rename", name.trim(), folder.id);
      if (place !== siblings.findIndex((item) => item.id === folder.id) + 1) await mutate("folder.place", { index: place }, folder.id);
      onClose();
    } catch {}
  }
  async function remove(trashCodes: boolean) {
    const ok = await ask({
      title: `Delete the folder “${folder.name}”?`,
      body: trashCodes ? "The folder, its sub-folders and every code inside go away. The codes wait in the trash for 30 days and can be restored." : "The folder and its sub-folders are removed. The codes inside are kept and keep working; you find them under “Not in a folder”.",
      action: trashCodes ? "Delete folder and codes" : "Delete folder only",
    });
    if (ok) await mutate("folder.delete", { trashCodes }, folder.id).then(onDeleted, () => {});
  }
  return (
    <Modal title="Folder settings" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <label>
          Name
          <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Position
          <Info text="1 puts this folder first among the folders next to it. You can also drag folder tiles to reorder them." />
          <input type="number" min={1} max={siblings.length} value={place} onChange={(e) => setPlace(Number(e.target.value))} />
          <small>
            of {siblings.length} folders here
          </small>
        </label>
        <button className="button primary">Save</button>
      </form>
      {ctx.canWrite && (
        <div className="stack" style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          <strong>Delete this folder</strong>
          <div className="row-actions">
            <button className="button danger" onClick={() => remove(false)}>
              <Trash2 size={15} /> Delete folder, keep codes
            </button>
            <button className="button danger" onClick={() => remove(true)}>
              <Trash2 size={15} /> Delete folder and codes
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
