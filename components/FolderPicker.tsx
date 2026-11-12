"use client";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderPlus, Search } from "lucide-react";
import { Ctx, folderPath } from "./ui";

/**
 * Choose a folder from a tree, search it by name, or make a new folder or sub-folder
 * right here without leaving the form.
 */
export default function FolderPicker({ ctx, value, onChange }: { ctx: Ctx; value: string; onChange: (id: string) => void }) {
  const { data, mutate, canWrite } = ctx;
  const folders = data.folders;
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [naming, setNaming] = useState("");
  const [busy, setBusy] = useState(false);
  // Branches leading to the chosen folder start open.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (let folder = folders.find((item) => item.id === value); folder?.parentId; folder = folders.find((item) => item.id === folder!.parentId)) ids.add(folder.parentId);
    return ids;
  });
  const children = useMemo(() => {
    const map = new Map<string | null, typeof folders>();
    for (const folder of folders) map.set(folder.parentId, [...(map.get(folder.parentId) || []), folder]);
    return map;
  }, [folders]);
  const matches = term.trim() ? folders.filter((folder) => folderPath(folders, folder.id).toLowerCase().includes(term.trim().toLowerCase())) : null;
  const toggle = (id: string) => setExpanded((ids) => (ids.has(id) ? new Set([...ids].filter((item) => item !== id)) : new Set([...ids, id])));
  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setTerm("");
  };

  async function create() {
    if (!naming.trim()) return;
    setBusy(true);
    try {
      const result = await mutate("folder.create", { name: naming.trim(), parentId: value || null });
      if (value) setExpanded((ids) => new Set([...ids, value]));
      onChange(result.entity.id);
      setNaming("");
    } catch {
    } finally {
      setBusy(false);
    }
  }

  const row = (folder: (typeof folders)[number], depth: number): React.ReactNode => {
    const kids = children.get(folder.id) || [];
    const isOpen = expanded.has(folder.id);
    return (
      <div key={folder.id}>
        <div className="picker-row" role="treeitem" aria-selected={value === folder.id} aria-expanded={kids.length ? isOpen : undefined} style={{ paddingLeft: 6 + depth * 18 }}>
          {kids.length ? (
            <button type="button" className="twist" aria-label={`${isOpen ? "Close" : "Open"} ${folder.name}`} onClick={() => toggle(folder.id)}>
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="twist" />
          )}
          <button type="button" className="row-actions grow" style={{ flexWrap: "nowrap", gap: 8, minHeight: 32, textAlign: "left" }} onClick={() => choose(folder.id)}>
            <Folder size={16} className="f" />
            <span className="grow truncate">{folder.name}</span>
            <small className="num">{folder._count.qrCodes}</small>
          </button>
        </div>
        {isOpen && kids.map((kid) => row(kid, depth + 1))}
      </div>
    );
  };

  return (
    <div className="picker">
      <button type="button" className="picker-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Folder size={16} className="f" />
        <span className="grow truncate">{value ? folderPath(folders, value) : "No folder"}</span>
        <ChevronDown size={15} className="muted" />
      </button>
      {open && (
        <div className="picker-body">
          {folders.length > 8 && (
            <div style={{ position: "relative" }}>
              <Search size={15} className="muted" style={{ position: "absolute", left: 10, top: 11 }} />
              <input autoFocus aria-label="Search folders" placeholder="Find a folder…" value={term} onChange={(event) => setTerm(event.target.value)} style={{ paddingLeft: 32 }} />
            </div>
          )}
          <div className="picker-tree" role="tree" aria-label="Folders">
            <button type="button" className="picker-row" aria-selected={!value} onClick={() => choose("")}>
              <span className="twist" />
              No folder
            </button>
            {matches
              ? matches.map((folder) => (
                  <button type="button" key={folder.id} className="picker-row" aria-selected={value === folder.id} onClick={() => choose(folder.id)}>
                    <Folder size={16} className="f" />
                    <span className="grow truncate">{folderPath(folders, folder.id)}</span>
                  </button>
                ))
              : (children.get(null) || []).map((folder) => row(folder, 0))}
            {matches && !matches.length && <p className="muted" style={{ padding: 8 }}>No folder matches “{term}”.</p>}
          </div>
          {canWrite && (
            <div className="picker-new">
              <input
                aria-label="New folder name"
                value={naming}
                maxLength={100}
                placeholder={value ? `New sub-folder in ${folders.find((folder) => folder.id === value)?.name}` : "New folder name"}
                onChange={(event) => setNaming(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), create())}
              />
              <button type="button" className="button small primary" disabled={busy || !naming.trim()} onClick={create}>
                <FolderPlus size={14} /> {value ? "Add inside" : "Add"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
