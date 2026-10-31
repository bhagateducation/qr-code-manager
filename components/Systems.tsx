"use client";
import { useEffect, useState } from "react";
import { Plus, X, Layers, Pencil } from "lucide-react";
import { api, Field, System } from "./Dashboard";
type RecordItem = {
  id: string;
  title: string;
  data: Record<string, string | number | boolean | null>;
};
export default function Systems({
  systems,
  canWrite,
  mutate,
}: {
  systems: System[];
  canWrite: boolean;
  mutate: (action: string, data?: unknown, id?: string) => Promise<any>;
}) {
  const [creating, setCreating] = useState(false),
    [fields, setFields] = useState<Field[]>([
      {
        key: "description",
        label: "Description",
        type: "text",
        isRequired: false,
      },
    ]),
    [selected, setSelected] = useState(""),
    [records, setRecords] = useState<RecordItem[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [record, setRecord] = useState<RecordItem | null>(null),
    [adding, setAdding] = useState(false),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0);
  const system = systems.find((s) => s.id === selected);
  async function load(id: string, index = page) {
    try {
      const data = await api(
        `/api/records?systemId=${encodeURIComponent(id)}&page=${index}`,
      );
      setRecords(data.records);
      setTotal(data.total);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (selected) load(selected);
  }, [selected, page]);
  async function createSystem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await mutate("system.create", {
        name: form.get("name"),
        description: form.get("description"),
        fields,
      });
      setSelected(result.entity.id);
      setCreating(false);
      setPage(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!system) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const values: Record<string, unknown> = {};
    for (const field of system.fields) {
      const raw = form.get(field.key);
      values[field.key] =
        field.type === "boolean"
          ? raw === "on"
          : field.type === "number"
            ? raw === ""
              ? null
              : Number(raw)
            : raw;
    }
    try {
      await mutate(
        record ? "record.update" : "record.create",
        { systemId: system.id, title: form.get("_title"), data: values },
        record?.id,
      );
      await load(system.id);
      setAdding(false);
      setRecord(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="panel-heading">
        <div>
          <h2>Shape the information behind your business.</h2>
          <p className="muted">
            Create a system, define its fields, then save your records.
          </p>
        </div>
        {canWrite && (
          <button className="button" onClick={() => setCreating(!creating)}>
            <Plus size={17} />
            New system
          </button>
        )}
      </div>
      {creating && (
        <form className="panel stack view-enter" onSubmit={createSystem}>
          <h2>Create a business system</h2>
          <div className="form-grid">
            <label>
              System name
              <input
                name="name"
                required
                maxLength={100}
                placeholder="e.g. Product inventory"
              />
            </label>
            <label>
              Description
              <input name="description" maxLength={500} />
            </label>
          </div>
          <h3>Custom fields</h3>
          {fields.map((f, i) => (
            <div className="field-editor" key={i}>
              <label>
                Label
                <input
                  value={f.label}
                  required
                  onChange={(e) =>
                    setFields(
                      fields.map((item, j) =>
                        j === i ? { ...item, label: e.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Key
                <input
                  value={f.key}
                  required
                  pattern="[a-z][a-z0-9_]{0,39}"
                  onChange={(e) =>
                    setFields(
                      fields.map((item, j) =>
                        j === i ? { ...item, key: e.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Type
                <select
                  value={f.type}
                  onChange={(e) =>
                    setFields(
                      fields.map((item, j) =>
                        j === i ? { ...item, type: e.target.value } : item,
                      ),
                    )
                  }
                >
                  {["text", "number", "date", "url", "boolean"].map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={f.isRequired}
                  onChange={(e) =>
                    setFields(
                      fields.map((item, j) =>
                        j === i
                          ? { ...item, isRequired: e.target.checked }
                          : item,
                      ),
                    )
                  }
                />
                Required
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove ${f.label}`}
                onClick={() => setFields(fields.filter((_, j) => j !== i))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <div className="row-actions">
            <button
              type="button"
              className="button"
              disabled={fields.length >= 30}
              onClick={() =>
                setFields([
                  ...fields,
                  {
                    key: `field_${fields.length + 1}`,
                    label: "New field",
                    type: "text",
                    isRequired: false,
                  },
                ])
              }
            >
              <Plus size={16} />
              Add field
            </button>
            <button disabled={busy} className="button primary">
              Save system
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setCreating(false)}
            >
              Cancel
            </button>
          </div>
          <small>
            Choose your schema carefully. Editing existing schemas with data
            migration is not yet available.
          </small>
        </form>
      )}
      <div className="systems-grid">
        {systems.map((s) => (
          <button
            key={s.id}
            className={`panel system-card ${selected === s.id ? "current" : ""}`}
            onClick={() => {
              setSelected(s.id);
              setPage(1);
              setAdding(false);
            }}
          >
            <Layers size={24} />
            <strong>{s.name}</strong>
            <span>
              {s.fields.length} fields · {s._count.records} records
            </span>
          </button>
        ))}
      </div>
      {!systems.length && !creating && (
        <div className="panel empty">
          <Layers size={32} />
          <h3>A place for your business information.</h3>
          <p>Create your first system to start adding structured records.</p>
        </div>
      )}
      {system && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>{system.name}</h2>
              <p className="muted">{system.description}</p>
            </div>
            {canWrite && (
              <button
                className="button primary"
                onClick={() => {
                  setRecord(null);
                  setAdding(true);
                }}
              >
                <Plus size={16} />
                Add record
              </button>
            )}
          </div>
          {adding && (
            <form
              key={record?.id || "new"}
              className="stack record-form"
              onSubmit={saveRecord}
            >
              <h3>{record ? "Edit record" : "New record"}</h3>
              <label>
                Record title
                <input
                  name="_title"
                  required
                  maxLength={100}
                  defaultValue={record?.title}
                />
              </label>
              <div className="form-grid">
                {system.fields.map((f) => (
                  <label
                    key={f.key}
                    className={f.type === "boolean" ? "checkbox" : ""}
                  >
                    {f.label}
                    {f.isRequired ? " *" : ""}
                    {f.type === "boolean" ? (
                      <input
                        name={f.key}
                        type="checkbox"
                        defaultChecked={!!record?.data[f.key]}
                      />
                    ) : (
                      <input
                        name={f.key}
                        type={
                          f.type === "number"
                            ? "number"
                            : f.type === "url"
                              ? "url"
                              : f.type === "date"
                                ? "date"
                                : "text"
                        }
                        step={f.type === "number" ? "any" : undefined}
                        required={f.isRequired}
                        defaultValue={String(record?.data[f.key] ?? "")}
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="row-actions">
                <button disabled={busy} className="button primary">
                  Save record
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  {system.fields.map((f) => (
                    <th key={f.key}>{f.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    {system.fields.map((f) => (
                      <td key={f.key}>{String(r.data[f.key] ?? "—")}</td>
                    ))}
                    <td>
                      <button
                        className="icon-button"
                        disabled={!canWrite}
                        aria-label={`Edit ${r.title}`}
                        onClick={() => {
                          setRecord(r);
                          setAdding(true);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!records.length && <p className="empty">No records yet.</p>}
          <div className="pagination">
            <span>{total} records</span>
            <div>
              <button
                className="button small"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>{page}</span>
              <button
                className="button small"
                disabled={page * 25 >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
