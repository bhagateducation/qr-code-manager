"use client";
import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, FolderOpen, Plus, Printer, Trash2, X } from "lucide-react";
import FolderPicker from "./FolderPicker";
import { api, Ctx, Empty, Info, plural, qrNumber, useLabelPref } from "./ui";

type SheetCode = { number: number; title: string; payload: string; path?: string; size?: number };

/** Every code of a folder (and its sub-folders) laid out for printing or saving as PDF. */
export function PrintSheet({ folderId, onClose, notify, label = true }: { folderId: string; onClose: () => void; notify: Ctx["notify"]; label?: boolean }) {
  const [withLabel, setWithLabel] = useState(label);
  const [size, setSize] = useState(3);
  const [sheet, setSheet] = useState<{ title: string; codes: SheetCode[] } | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([api(`/api/workspace/export?kind=sheet&folder=${encodeURIComponent(folderId)}`), import("qrcode")])
      .then(([data, { default: QRCode }]) => {
        if (!active) return;
        setSheet({
          title: data.title,
          codes: data.codes.map((code: SheetCode) => {
            const { modules } = QRCode.create(code.payload, { errorCorrectionLevel: "M" });
            let path = "";
            for (let y = 0; y < modules.size; y++) for (let x = 0; x < modules.size; x++) if (modules.get(y, x)) path += `M${x} ${y}h1v1h-1z`;
            return { ...code, path, size: modules.size };
          }),
        });
      })
      .catch((e) => (notify(e.message, "error"), onClose()));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass fresh callbacks each render; only the folder should refetch
  }, [folderId]);
  return createPortal(
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Print sheet">
      <div className="sheet-bar">
        <strong className="grow truncate">{sheet ? `${sheet.title} · ${plural(sheet.codes.length, "code")}` : "Preparing the sheet…"}</strong>
        <label className="toggle-row">
          <input type="checkbox" checked={withLabel} onChange={(event) => setWithLabel(event.target.checked)} />
          Show name and number
        </label>
        <label className="toggle-row">
          QR size
          <select aria-label="Printed QR size" value={size} onChange={(event) => setSize(Number(event.target.value))} style={{ width: "auto", minHeight: 30, padding: "2px 8px", margin: 0 }}>
            {[2, 2.5, 3, 4, 5, 7].map((cm) => (
              <option key={cm} value={cm}>
                {cm} cm
              </option>
            ))}
          </select>
        </label>
        <button className="button primary" disabled={!sheet?.codes.length} onClick={() => window.print()}>
          <Printer size={16} /> Print or save as PDF
        </button>
        <button className="icon-button" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      {sheet && !sheet.codes.length && <p className="empty">This folder has no codes yet.</p>}
      <div className="sheet-grid" style={{ "--qr-cm": `${size}cm` } as React.CSSProperties}>
        {sheet?.codes.map((code) => (
          <figure key={code.number}>
            <svg viewBox={`-2 -2 ${code.size! + 4} ${code.size! + 4}`} shapeRendering="crispEdges" role="img" aria-label={code.title}>
              <rect x={-2} y={-2} width={code.size! + 4} height={code.size! + 4} fill="#fff" />
              <path d={code.path} fill="#000" />
            </svg>
            {withLabel && (
              <figcaption>
                <b>{code.title}</b>
                {qrNumber(code.number)}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>,
    document.body,
  );
}

type Chapter = { name: string; questions: number };

/** Book QR: one book folder, a sub-folder per chapter and a dynamic code per question, created in one step. */
export default function Books({ ctx }: { ctx: Ctx }) {
  const { data, canWrite, mutate, ask, notify, openFolder } = ctx;
  const [chapters, setChapters] = useState<Chapter[]>([{ name: "Chapter 1", questions: 10 }]);
  const [fill, setFill] = useState({ chapters: 10, questions: 20 });
  const [busy, setBusy] = useState(false);
  const [parent, setParent] = useState("");
  const [printing, setPrinting] = useState("");
  const [withLabel] = useLabelPref();
  const total = chapters.reduce((sum, chapter) => sum + (chapter.questions || 0), 0);
  const left = data.limits.codes === null ? Infinity : data.limits.codes - data.usage.codes;
  const books = data.folders.filter((folder) => folder.kind === "book");
  const setChapter = (index: number, patch: Partial<Chapter>) => setChapters(chapters.map((chapter, i) => (i === index ? { ...chapter, ...patch } : chapter)));

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setBusy(true);
    try {
      const result = await mutate("book.create", { title: form.get("title"), urlTemplate: form.get("urlTemplate") || "", parentId: parent || null, chapters });
      element.reset();
      setChapters([{ name: "Chapter 1", questions: 10 }]);
      openFolder(result.entity.id);
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack">
      {canWrite && (
        <form className="panel stack" onSubmit={create}>
          <div>
            <h2>New book</h2>
            <p className="muted">Makes a folder for the book, a folder for each chapter and one QR code for every question. Each code is dynamic, so you can change its link later.</p>
          </div>
          <div className="form-grid">
            <label>
              Book name
              <input name="title" required maxLength={100} placeholder="e.g. Army GD Maths" />
            </label>
            <label>
              Link for each question (optional)
              <Info text="Where each question's code opens. Write it once with {chapter} and {question}, e.g. https://example.com/maths/{chapter}/{question}. Leave it empty to add links later (one by one, or by exporting to Excel, filling the Link column and importing back). Until a link is added, a scan opens the code's own page on your domain, never an error." />
              <input name="urlTemplate" maxLength={1500} placeholder="https://example.com/maths/{chapter}/{question}" />
              <small>
                Printed codes always use <code>{data.linkBase.replace(/^https?:\/\//, "")}</code>
                {data.domain?.use ? " (your domain)" : ""}, and keep working when you change links later.
              </small>
            </label>
            <label>
              Put the book in
              <Info text="Pick a folder to keep this book inside, e.g. a class or subject. Leave it empty to put the book at the top." />
              <FolderPicker ctx={ctx} value={parent} onChange={setParent} />
            </label>
          </div>
          <div className="inline-form">
            <label style={{ flex: "0 1 130px" }}>
              Chapters
              <Info text="Each chapter becomes a sub-folder inside the book's folder, so codes stay sorted chapter by chapter. Set the counts, press Fill the list, then rename chapters or change their question counts one by one." />
              <input type="number" min={1} max={60} value={fill.chapters} onChange={(e) => setFill({ ...fill, chapters: Number(e.target.value) })} />
            </label>
            <label style={{ flex: "0 1 170px" }}>
              Questions per chapter
              <input type="number" min={1} max={200} value={fill.questions} onChange={(e) => setFill({ ...fill, questions: Number(e.target.value) })} />
            </label>
            <button type="button" className="button" onClick={() => setChapters(Array.from({ length: Math.min(60, Math.max(1, fill.chapters || 1)) }, (_, i) => ({ name: `Chapter ${i + 1}`, questions: Math.min(200, Math.max(1, fill.questions || 1)) })))}>
              Fill the list
            </button>
          </div>
          <div className="chapter-list">
            {chapters.map((chapter, index) => (
              <div className="chapter-row" key={index}>
                <span className="muted num">{index + 1}</span>
                <input aria-label={`Name of chapter ${index + 1}`} value={chapter.name} required maxLength={100} onChange={(e) => setChapter(index, { name: e.target.value })} />
                <input aria-label={`Questions in chapter ${index + 1}`} type="number" min={1} max={200} required value={chapter.questions || ""} onChange={(e) => setChapter(index, { questions: Number(e.target.value) })} />
                <button type="button" className="icon-button danger" aria-label={`Remove chapter ${index + 1}`} disabled={chapters.length === 1} onClick={() => setChapters(chapters.filter((_, i) => i !== index))}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="row-actions">
            <button type="button" className="button" disabled={chapters.length >= 60} onClick={() => setChapters([...chapters, { name: `Chapter ${chapters.length + 1}`, questions: chapters.at(-1)?.questions || 10 }])}>
              <Plus size={16} /> Add chapter
            </button>
            <span className="grow" />
            <small className="num" style={total > left || total > 1000 ? { color: "var(--danger)" } : undefined}>
              {plural(total, "code")} · {total > 1000 ? "the most in one go is 1,000" : `${left === Infinity ? "no plan limit" : `${Math.max(0, left).toLocaleString()} left on your plan`}`}
            </small>
            <button className="button primary" disabled={busy || total > left || total > 1000 || !total}>
              {busy ? "Creating…" : `Create ${plural(total, "code")}`}
            </button>
          </div>
        </form>
      )}
      <div className="panel flush">
        <div className="panel-heading">
          <h2>Your books</h2>
        </div>
        <div className="feature-list">
          {books.map((book) => {
            const parts = data.folders.filter((folder) => folder.parentId === book.id);
            const codes = book._count.qrCodes + parts.reduce((sum, folder) => sum + folder._count.qrCodes, 0);
            return (
              <div className="feature-row" key={book.id}>
                <span className="qr-tile">
                  <BookOpen size={17} />
                </span>
                <div>
                  <strong>{book.name}</strong>
                  <small>
                    {plural(parts.length, "chapter")} · {plural(codes, "code")}
                  </small>
                </div>
                <button className="button small" onClick={() => openFolder(book.id)}>
                  <FolderOpen size={14} /> Open
                </button>
                <button className="button small" onClick={() => setPrinting(book.id)}>
                  <Printer size={14} /> Print sheet
                </button>
                {canWrite && (
                  <button className="icon-button danger" aria-label={`Delete ${book.name}`} onClick={async () => (await ask({ title: `Delete the book “${book.name}”?`, body: "The book and its chapter folders are removed. Its QR codes are kept and keep working; they just no longer sit in a folder.", action: "Delete book" })) && mutate("folder.delete", undefined, book.id).catch(() => {})}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {!books.length && <Empty icon={BookOpen} title="No books yet" text="Create a book above to get a QR code for every question, sorted by chapter." />}
      </div>
      {printing && <PrintSheet folderId={printing} onClose={() => setPrinting("")} notify={notify} label={withLabel} />}
    </div>
  );
}
