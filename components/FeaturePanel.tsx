"use client";

import { FormEvent, useState } from "react";
import { Check, Copy, Plus, Power, Trash2 } from "lucide-react";

type Feature = "tags" | "functions" | "workflows" | "campaigns" | "integrations" | "webhooks" | "apiKeys";

export default function FeaturePanel({
  feature,
  data,
  canWrite,
  mutate,
}: {
  feature: Feature;
  data: any;
  canWrite: boolean;
  mutate: (action: string, payload?: unknown, id?: string) => Promise<any>;
}) {
  if (feature === "tags") return <Tags data={data} canWrite={canWrite} mutate={mutate} />;
  if (feature === "campaigns") return <Campaigns data={data} canWrite={canWrite} mutate={mutate} />;
  if (feature === "integrations") return <Integrations data={data} canWrite={canWrite} mutate={mutate} />;
  if (feature === "webhooks") return <Webhooks data={data} canWrite={canWrite} mutate={mutate} />;
  if (feature === "apiKeys") return <ApiKeys data={data} canWrite={canWrite} mutate={mutate} />;
  return <Automations kind={feature === "functions" ? "function" : "workflow"} data={data} canWrite={canWrite} mutate={mutate} />;
}

function Header({ title, description }: { title: string; description: string }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p className="muted">{description}</p></div></div>;
}

function Tags({ data, canWrite, mutate }: any) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try { await mutate("tag.create", { name: form.get("name"), color: form.get("color") }); event.currentTarget.reset(); }
    finally { setBusy(false); }
  }
  return <div className="stack"><Header title="Tags & collections" description="Create reusable labels for campaigns, records and QR code organisation." />
    <div className="panel"><form className="row-actions" onSubmit={submit}><input name="name" required maxLength={50} placeholder="e.g. Summer campaign" /><input name="color" type="color" defaultValue="#5B43D6" aria-label="Tag colour" /><button className="button primary" disabled={!canWrite || busy}><Plus size={16} /> Add tag</button></form></div>
    <div className="panel"><div className="feature-list">{data.tags.map((tag: any) => <div className="feature-row" key={tag.id}><span className="tag-dot" style={{ background: tag.color }} /><strong>{tag.name}</strong><small>{new Date(tag.createdAt).toLocaleDateString()}</small>{canWrite && <button className="icon-button" aria-label={`Delete ${tag.name}`} onClick={() => mutate("tag.delete", undefined, tag.id)}><Trash2 size={15} /></button>}</div>)}{!data.tags.length && <p className="empty">No tags yet. Add your first collection above.</p>}</div></div>
  </div>;
}

function Automations({ kind, data, canWrite, mutate }: any) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget); try { await mutate("automation.create", { name: form.get("name"), kind, config: { steps: [] } }); event.currentTarget.reset(); } finally { setBusy(false); } }
  const rows = data.automations.filter((item: any) => item.kind === kind);
  return <div className="stack"><Header title={kind === "function" ? "Business functions" : "Workflows"} description={kind === "function" ? "Define repeatable actions that can be triggered by a QR scan." : "Create workflow definitions with a clear active state and audit trail."} />
    <div className="panel"><form className="row-actions" onSubmit={submit}><input name="name" required maxLength={100} placeholder={kind === "function" ? "e.g. Redeem voucher" : "e.g. New customer follow-up"} /><button className="button primary" disabled={!canWrite || busy}><Plus size={16} /> Create {kind}</button></form></div>
    <div className="panel"><div className="feature-list">{rows.map((item: any) => <div className="feature-row" key={item.id}><div><strong>{item.name}</strong><small>{item.isActive ? "Active" : "Paused"} · created {new Date(item.createdAt).toLocaleDateString()}</small></div>{canWrite && <><button className="button small" onClick={() => mutate("automation.toggle", undefined, item.id)}><Power size={14} /> {item.isActive ? "Pause" : "Activate"}</button><button className="icon-button" aria-label={`Delete ${item.name}`} onClick={() => mutate("automation.delete", undefined, item.id)}><Trash2 size={15} /></button></>}</div>)}{!rows.length && <p className="empty">No {kind}s yet. Create one to start building your automation library.</p>}</div></div>
  </div>;
}

function Campaigns({ data, canWrite, mutate }: any) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget); try { await mutate("campaign.create", { name: form.get("name"), description: form.get("description"), status: "draft" }); event.currentTarget.reset(); } finally { setBusy(false); } }
  return <div className="stack"><Header title="Campaigns" description="Create campaign containers for QR codes and measure their performance." />
    <div className="panel"><form className="stack" onSubmit={submit}><div className="form-grid"><label>Campaign name<input name="name" required maxLength={100} /></label><label>Description<input name="description" maxLength={500} /></label></div><button className="button primary" disabled={!canWrite || busy}><Plus size={16} /> Create campaign</button></form></div>
    <div className="panel"><div className="feature-list">{data.campaigns.map((item: any) => <div className="feature-row" key={item.id}><div><strong>{item.name}</strong><small>{item.description || "No description"}</small></div>{canWrite && <><select value={item.status} onChange={(event) => mutate("campaign.status", { status: event.target.value }, item.id)}><option>draft</option><option>active</option><option>paused</option><option>completed</option></select><button className="icon-button" aria-label={`Delete ${item.name}`} onClick={() => mutate("campaign.delete", undefined, item.id)}><Trash2 size={15} /></button></>}</div>)}{!data.campaigns.length && <p className="empty">No campaigns yet.</p>}</div></div>
  </div>;
}

function Integrations({ data, canWrite, mutate }: any) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget); try { await mutate("integration.create", { provider: form.get("provider"), name: form.get("name"), config: {} }); event.currentTarget.reset(); } finally { setBusy(false); } }
  return <div className="stack"><Header title="Integrations" description="Register external services with an explicit workspace status before credentials are connected." />
    <div className="panel"><form className="row-actions" onSubmit={submit}><input name="provider" required maxLength={50} placeholder="Provider (e.g. Slack)" /><input name="name" required maxLength={100} placeholder="Connection name" /><button className="button primary" disabled={!canWrite || busy}><Plus size={16} /> Add integration</button></form></div>
    <div className="panel"><div className="feature-list">{data.integrations.map((item: any) => <div className="feature-row" key={item.id}><div><strong>{item.name}</strong><small>{item.provider} · {item.status}</small></div>{canWrite && <><button className="button small" onClick={() => mutate("integration.toggle", undefined, item.id)}>{item.status === "active" ? "Pause" : "Activate"}</button><button className="icon-button" aria-label={`Delete ${item.name}`} onClick={() => mutate("integration.delete", undefined, item.id)}><Trash2 size={15} /></button></>}</div>)}{!data.integrations.length && <p className="empty">No integrations configured.</p>}</div></div>
  </div>;
}

function Webhooks({ data, canWrite, mutate }: any) {
  const [secret, setSecret] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget); try { const result = await mutate("webhook.create", { url: form.get("url"), events: String(form.get("events") || "scan.created").split(",").map((value) => value.trim()).filter(Boolean) }); setSecret(result.oneTimeSecret || ""); event.currentTarget.reset(); } finally { setBusy(false); } }
  return <div className="stack"><Header title="API & Webhooks" description="Create signed webhook endpoints and manage delivery targets per workspace." />
    {secret && <div className="notice"><strong>Copy this webhook secret now:</strong><code className="secret-value">{secret}</code><button className="button small" onClick={() => navigator.clipboard.writeText(secret)}><Copy size={14} /> Copy</button></div>}
    <div className="panel"><form className="stack" onSubmit={submit}><div className="form-grid"><label>Endpoint URL<input name="url" type="url" required placeholder="https://example.com/hooks/qr" /></label><label>Events<input name="events" defaultValue="scan.created,record.updated" placeholder="scan.created, record.updated" /></label></div><button className="button primary" disabled={!canWrite || busy}><Plus size={16} /> Add webhook</button></form></div>
    <div className="panel"><div className="feature-list">{data.webhooks.map((item: any) => <div className="feature-row" key={item.id}><div><strong>{item.url}</strong><small>{Array.isArray(item.events) ? item.events.join(", ") : "Configured events"} · {item.isActive ? "Active" : "Paused"}</small></div>{canWrite && <><button className="button small" onClick={() => mutate("webhook.toggle", undefined, item.id)}>{item.isActive ? "Pause" : "Activate"}</button><button className="icon-button" aria-label="Delete webhook" onClick={() => mutate("webhook.delete", undefined, item.id)}><Trash2 size={15} /></button></>}</div>)}{!data.webhooks.length && <p className="empty">No webhook endpoints yet.</p>}</div></div>
  </div>;
}

function ApiKeys({ data, canWrite, mutate }: any) {
  const [secret, setSecret] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget); try { const result = await mutate("apiKey.create", { label: form.get("label") }); setSecret(result.oneTimeSecret || ""); event.currentTarget.reset(); } finally { setBusy(false); } }
  return <div className="stack"><Header title="API keys" description="Issue scoped workspace credentials. Secrets are shown once and stored only as hashes." />
    {secret && <div className="notice"><strong>Copy this API key now:</strong><code className="secret-value">{secret}</code><button className="button small" onClick={() => navigator.clipboard.writeText(secret)}><Copy size={14} /> Copy</button></div>}
    <div className="panel"><form className="row-actions" onSubmit={submit}><input name="label" required maxLength={100} placeholder="Key label" /><button className="button primary" disabled={!canWrite || busy}><Plus size={16} /> Create API key</button></form></div>
    <div className="panel"><div className="feature-list">{data.apiKeys.map((item: any) => <div className="feature-row" key={item.id}><div><strong>{item.label}</strong><small>{item.prefix}… · {item.revokedAt ? "Revoked" : "Active"}</small></div>{canWrite && !item.revokedAt && <button className="button small" onClick={() => mutate("apiKey.revoke", undefined, item.id)}>Revoke</button>}</div>)}{!data.apiKeys.length && <p className="empty">No API keys created.</p>}</div></div>
  </div>;
}
