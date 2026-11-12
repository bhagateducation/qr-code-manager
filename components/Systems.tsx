"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Eye, EyeOff, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, Ctx, Empty, Field, Modal, itemMotion, limitText, listMotion, plural } from "./ui";

type RecordItem = { id: string; title: string; publicToken: string; isPublic: boolean; data: Record<string, string | number | boolean | null> };
const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "url", label: "Link" },
  { value: "boolean", label: "Yes / No" },
];
// Field keys are derived from labels so nobody has to type snake_case by hand.
const toKey = (label: string, index: number) => (label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^[^a-z]+|_+$/g, "").slice(0, 36) || "field") + (index ? `_${index}` : "");
function withKeys(fields: Field[]) {
  const seen = new Set<string>();
  return fields.map((field) => {
    let index = 0;
    while (seen.has(toKey(field.label, index))) index++;
    seen.add(toKey(field.label, index));
    return { ...field, key: toKey(field.label, index) };
  });
}

export default function Systems({ ctx }: { ctx: Ctx }) {
  const { data, canWrite, mutate, notify, ask } = ctx;
  const [creating, setCreating] = useState(false),
    [fields, setFields] = useState<Field[]>([{ key: "", label: "Description", type: "text", isRequired: false }]),
    [selected, setSelected] = useState(""),
    [records, setRecords] = useState<RecordItem[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<RecordItem | null | undefined>(undefined),
    [busy, setBusy] = useState(false);
  const system = data.systems.find((item) => item.id === selected);

  const load = useCallback(async () => {
    if (!selected) return;
    try {
      const result = await api(`/api/records?systemId=${encodeURIComponent(selected)}&page=${page}`);
      setRecords(result.records);
      setTotal(result.total);
    } catch (e) {
      notify((e as Error).message, "error");
    }
  }, [selected, page, notify]);
  useEffect(() => {
    load();
  }, [load]);
  const setField = (index: number, patch: Partial<Field>) => setFields(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)));

  async function createSystem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await mutate("system.create", { name: form.get("name"), description: form.get("description"), fields: withKeys(fields) });
      setSelected(result.entity.id);
      setPage(1);
      setCreating(false);
    } catch {
    } finally {
      setBusy(false);
    }
  }
  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!system) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const values: Record<string, unknown> = {};
    for (const field of system.fields) {
      const raw = form.get(field.key);
      values[field.key] = field.type === "boolean" ? raw === "on" : field.type === "number" ? (raw === "" ? null : Number(raw)) : raw;
    }
    try {
      await mutate(editing ? "record.update" : "record.create", { systemId: system.id, title: form.get("_title"), data: values }, editing?.id);
      await load();
      setEditing(undefined);
    } catch {
    } finally {
      setBusy(false);
    }
  }
  async function removeSystem() {
    if (system && (await ask({ title: `Delete “${system.name}”?`, body: `This also deletes its ${plural(system._count.records, "record")} and their public pages. This cannot be undone.`, action: "Delete system" }))) {
      await mutate("system.delete", undefined, system.id).catch(() => {});
      setSelected("");
    }
  }
  async function removeRecord(record: RecordItem) {
    if (await ask({ title: `Delete “${record.title}”?`, body: "The record and its public page are removed. This cannot be undone.", action: "Delete record" })) await mutate("record.delete", undefined, record.id).then(load, () => {});
  }

  return (
    <div className="page-stack">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Your systems</h2>
            <p className="muted">
              A system is a custom table, such as products, assets or members. {data.usage.systems} of {limitText(data.limits.systems)} used.
            </p>
          </div>
          {canWrite && !creating && (
            <button className="button primary" onClick={() => setCreating(true)}>
              <Plus size={16} /> New system
            </button>
          )}
        </div>
        {data.systems.length ? (
          <motion.div className="systems-grid" variants={listMotion} initial="hidden" animate="show">
            {data.systems.map((item) => (
              <motion.button
                variants={itemMotion}
                key={item.id}
                className={`panel system-card ${selected === item.id ? "current" : ""}`}
                aria-pressed={selected === item.id}
                onClick={() => {
                  setSelected(item.id);
                  setPage(1);
                }}
              >
                <Layers />
                <strong>{item.name}</strong>
                <span>
                  {plural(item.fields.length, "field")} · {plural(item._count.records, "record")}
                </span>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          !creating && <Empty icon={Layers} title="No systems yet" text="Create one to store structured records and give each a public page a QR code can open." />
        )}
      </div>

      <AnimatePresence>
        {creating && (
          <motion.form className="panel stack" onSubmit={createSystem} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <h2>New system</h2>
            <div className="form-grid">
              <label>
                Name
                <input name="name" required maxLength={100} placeholder="e.g. Product inventory" autoFocus />
              </label>
              <label>
                Description
                <input name="description" maxLength={500} placeholder="Optional" />
              </label>
            </div>
            <h3>Fields</h3>
            {fields.map((field, index) => (
              <div className="field-editor" key={index}>
                <label>
                  Field name
                  <input value={field.label} required maxLength={100} onChange={(e) => setField(index, { label: e.target.value })} />
                </label>
                <label>
                  Type
                  <select value={field.type} onChange={(e) => setField(index, { type: e.target.value })}>
                    {fieldTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkbox">
                  <input type="checkbox" checked={field.isRequired} onChange={(e) => setField(index, { isRequired: e.target.checked })} /> Required
                </label>
                <span />
                <button type="button" className="icon-button danger" aria-label={`Remove ${field.label || "field"}`} onClick={() => setFields(fields.filter((_, i) => i !== index))}>
                  <X size={16} />
                </button>
              </div>
            ))}
            <small>Fields cannot be changed after the system is created, so add everything you need now.</small>
            <div className="row-actions">
              <button type="button" className="button" disabled={fields.length >= 30} onClick={() => setFields([...fields, { key: "", label: "", type: "text", isRequired: false }])}>
                <Plus size={16} /> Add field
              </button>
              <span className="grow" />
              <button type="button" className="button" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button disabled={busy} className="button primary">
                {busy ? "Creating…" : "Create system"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {system && (
        <motion.div className="panel flush" key={system.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="panel-heading">
            <div>
              <h2>{system.name}</h2>
              {system.description && <p className="muted">{system.description}</p>}
            </div>
            {canWrite && (
              <div className="row-actions">
                <button className="icon-button danger" aria-label={`Delete ${system.name}`} title="Delete system" onClick={removeSystem}>
                  <Trash2 size={16} />
                </button>
                <button className="button primary" onClick={() => setEditing(null)}>
                  <Plus size={16} /> Add record
                </button>
              </div>
            )}
          </div>
          {records.length ? (
            <div className="table-scroll">
              <table className="cards">
                <thead>
                  <tr>
                    <th>Record</th>
                    {system.fields.slice(0, 3).map((field) => (
                      <th key={field.key}>{field.label}</th>
                    ))}
                    <th>Public page</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.title}</strong>
                      </td>
                      {system.fields.slice(0, 3).map((field) => {
                        const value = record.data[field.key];
                        return (
                          <td key={field.key} data-label={field.label}>
                            <span className="truncate" style={{ maxWidth: 200, display: "inline-block" }}>
                              {value === null || value === undefined || value === "" ? "—" : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                            </span>
                          </td>
                        );
                      })}
                      <td data-label="Public page">
                        {record.isPublic ? (
                          <a className="destination" href={`/p/${record.publicToken}`} target="_blank" rel="noopener noreferrer">
                            <span>Open page</span> <ExternalLink size={13} />
                          </a>
                        ) : (
                          <span className="badge neutral">Private</span>
                        )}
                      </td>
                      <td className="actions">
                        {canWrite && (
                          <div className="row-actions" style={{ flexWrap: "nowrap", justifyContent: "flex-end", gap: 2 }}>
                            <button className="icon-button" title={record.isPublic ? "Make private" : "Publish a public page"} aria-label={`${record.isPublic ? "Unpublish" : "Publish"} ${record.title}`} onClick={() => void mutate("record.publish", undefined, record.id).then(load, () => {})}>
                              {record.isPublic ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button className="icon-button" title="Edit" aria-label={`Edit ${record.title}`} onClick={() => setEditing(record)}>
                              <Pencil size={16} />
                            </button>
                            <button className="icon-button danger" title="Delete" aria-label={`Delete ${record.title}`} onClick={() => removeRecord(record)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon={Layers} title="No records yet" text="Add the first record. Publish it to get a public page you can point a QR code at." />
          )}
          <div className="pagination">
            <span>{plural(total, "record")}</span>
            <div>
              <button className="button small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span>Page {page}</span>
              <button className="button small" disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>
                Next
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {system && editing !== undefined && (
          <Modal wide title={editing ? "Edit record" : `New record in ${system.name}`} onClose={() => setEditing(undefined)}>
            <form className="stack" onSubmit={saveRecord}>
              <label>
                Title
                <input name="_title" required maxLength={100} defaultValue={editing?.title || ""} />
              </label>
              <div className="form-grid">
                {system.fields.map((field) => {
                  const value = editing?.data[field.key];
                  return field.type === "boolean" ? (
                    <label className="checkbox" key={field.key}>
                      <input type="checkbox" name={field.key} defaultChecked={value === true} /> {field.label}
                    </label>
                  ) : (
                    <label key={field.key}>
                      {field.label}
                      <input name={field.key} type={field.type === "text" ? "text" : field.type} step={field.type === "number" ? "any" : undefined} required={field.isRequired} maxLength={4000} defaultValue={value === null || value === undefined ? "" : String(value)} placeholder={field.type === "url" ? "https://" : undefined} />
                    </label>
                  );
                })}
              </div>
              <div className="modal-actions">
                <button type="button" className="button" onClick={() => setEditing(undefined)}>
                  Cancel
                </button>
                <button disabled={busy} className="button primary">
                  {busy ? "Saving…" : "Save record"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
