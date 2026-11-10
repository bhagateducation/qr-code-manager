"use client";
import { FormEvent, useState } from "react";
import { Code2, KeyRound, Megaphone, Plus, Tag, Trash2 } from "lucide-react";
import { Ctx, Empty, Secret, formatDate, formatDateTime } from "./ui";

/** Runs a create form: disables the button while saving and clears the form on success. */
function useCreate(run: (form: FormData) => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    setBusy(true);
    try {
      await run(new FormData(element));
      element.reset();
    } catch {
      // the shell already showed the error toast
    } finally {
      setBusy(false);
    }
  }
  return { busy, submit };
}
const AdminOnly = () => <p className="notice info">Only workspace owners and admins can manage this section.</p>;

export function Tags({ ctx }: { ctx: Ctx }) {
  const { data, canWrite, mutate, ask } = ctx;
  const { busy, submit } = useCreate((form) => mutate("tag.create", { name: form.get("name"), color: form.get("color") }));
  return (
    <div className="page-stack">
      {canWrite && (
        <form className="panel inline-form" onSubmit={submit}>
          <label>
            Tag name
            <input name="name" required maxLength={50} placeholder="e.g. Packaging" />
          </label>
          <input name="color" type="color" defaultValue="#7660dc" aria-label="Tag colour" style={{ flex: "none" }} />
          <button className="button primary" disabled={busy}>
            <Plus size={16} /> Add tag
          </button>
        </form>
      )}
      <div className="panel">
        <div className="feature-list">
          {data.tags.map((tag) => (
            <div className="feature-row" key={tag.id}>
              <span className="tag-dot" style={{ background: tag.color }} />
              <div>
                <strong>{tag.name}</strong>
                <small>Created {formatDate(tag.createdAt)}</small>
              </div>
              {canWrite && (
                <button className="icon-button danger" aria-label={`Delete ${tag.name}`} onClick={async () => (await ask({ title: `Delete tag “${tag.name}”?`, body: "It is removed from every QR code that uses it. The codes themselves are not affected.", action: "Delete tag" })) && mutate("tag.delete", undefined, tag.id).catch(() => {})}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        {!data.tags.length && <Empty icon={Tag} title="No tags yet" text="Tags are colour labels you attach to QR codes to keep them organised." />}
      </div>
    </div>
  );
}

export function Campaigns({ ctx }: { ctx: Ctx }) {
  const { data, canWrite, mutate, ask } = ctx;
  const { busy, submit } = useCreate((form) => mutate("campaign.create", { name: form.get("name"), description: form.get("description") || undefined, status: "active" }));
  return (
    <div className="page-stack">
      {canWrite && (
        <form className="panel inline-form" onSubmit={submit}>
          <label>
            Campaign name
            <input name="name" required maxLength={100} placeholder="e.g. Diwali offer" />
          </label>
          <label>
            Description
            <input name="description" maxLength={500} placeholder="Optional" />
          </label>
          <button className="button primary" disabled={busy}>
            <Plus size={16} /> Create campaign
          </button>
        </form>
      )}
      <div className="panel">
        <div className="feature-list">
          {data.campaigns.map((campaign) => (
            <div className="feature-row" key={campaign.id}>
              <div>
                <strong>{campaign.name}</strong>
                <small>{campaign.description || `Created ${formatDate(campaign.createdAt)}`}</small>
              </div>
              {canWrite ? (
                <>
                  <select aria-label={`Status of ${campaign.name}`} value={campaign.status} onChange={(event) => void mutate("campaign.status", { status: event.target.value }, campaign.id).catch(() => {})}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button className="icon-button danger" aria-label={`Delete ${campaign.name}`} onClick={async () => (await ask({ title: `Delete campaign “${campaign.name}”?`, body: "Its QR codes stay active but are no longer grouped under this campaign.", action: "Delete campaign" })) && mutate("campaign.delete", undefined, campaign.id).catch(() => {})}>
                    <Trash2 size={16} />
                  </button>
                </>
              ) : (
                <span className="badge">{campaign.status}</span>
              )}
            </div>
          ))}
        </div>
        {!data.campaigns.length && <Empty icon={Megaphone} title="No campaigns yet" text="Create a campaign, then assign QR codes to it from the code editor." />}
      </div>
    </div>
  );
}

export function Webhooks({ ctx }: { ctx: Ctx }) {
  const { data, isAdmin, mutate, notify, ask } = ctx;
  const [secret, setSecret] = useState("");
  const { busy, submit } = useCreate(async (form) => setSecret((await mutate("webhook.create", { url: form.get("url"), events: ["scan.created"] })).oneTimeSecret || ""));
  return (
    <div className="page-stack">
      {!isAdmin && <AdminOnly />}
      {secret && <Secret title="Signing secret — shown only once. Store it now:" value={secret} notify={notify} />}
      {isAdmin && (
        <form className="panel inline-form" onSubmit={submit}>
          <label>
            Endpoint URL
            <input name="url" type="url" required placeholder="https://example.com/hooks/qr" maxLength={2048} />
            <small>
              We POST a signed <code>scan.created</code> event to this public HTTPS address every time one of your codes is scanned.
            </small>
          </label>
          <button className="button primary" disabled={busy} style={{ alignSelf: "center" }}>
            <Plus size={16} /> Add webhook
          </button>
        </form>
      )}
      <div className="panel">
        <div className="feature-list">
          {data.webhooks.map((hook) => (
            <div className="feature-row" key={hook.id}>
              <div>
                <strong>{hook.url}</strong>
                <small>Added {formatDate(hook.createdAt)}</small>
              </div>
              <span className={`status ${hook.isActive ? "active" : ""}`}>{hook.isActive ? "Active" : "Paused"}</span>
              {isAdmin && (
                <>
                  <button className="button small" onClick={() => void mutate("webhook.toggle", undefined, hook.id).catch(() => {})}>
                    {hook.isActive ? "Pause" : "Resume"}
                  </button>
                  <button className="icon-button danger" aria-label="Delete webhook" onClick={async () => (await ask({ title: "Delete this webhook?", body: `${hook.url} stops receiving scan events and its delivery history is removed.`, action: "Delete webhook" })) && mutate("webhook.delete", undefined, hook.id).catch(() => {})}>
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        {!data.webhooks.length && <Empty icon={Code2} title="No webhooks yet" text="Add an endpoint to receive scan events in your own system in real time." />}
      </div>
      {data.webhooks.length > 0 && (
        <div className="panel">
          <div className="panel-heading">
            <h2>Recent deliveries</h2>
          </div>
          <div className="feature-list">
            {data.webhookDeliveries.slice(0, 20).map((delivery) => (
              <div className="feature-row" key={delivery.id}>
                <div>
                  <strong>{delivery.webhook.url}</strong>
                  <small>
                    {formatDateTime(delivery.createdAt)} · {delivery.responseCode ? `HTTP ${delivery.responseCode}` : delivery.lastError || "No response"}
                  </small>
                </div>
                <span className={`badge ${delivery.status === "delivered" ? "success" : delivery.status === "failed" ? "error" : "neutral"}`}>{delivery.status}</span>
              </div>
            ))}
            {!data.webhookDeliveries.length && <small>No deliveries yet. Scan one of your codes to trigger the first event.</small>}
          </div>
          <details style={{ marginTop: 14 }}>
            <summary>How to verify a delivery</summary>
            <div className="details-content stack">
              <p className="muted">
                Compute an HMAC-SHA256 of the raw request body with your signing secret and compare it to the <code>X-QR-Manager-Signature</code> header (<code>sha256=…</code>). Respond with any 2xx status within five seconds.
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export function ApiKeys({ ctx }: { ctx: Ctx }) {
  const { data, isAdmin, mutate, notify, ask } = ctx;
  const [secret, setSecret] = useState("");
  const { busy, submit } = useCreate(async (form) => setSecret((await mutate("apiKey.create", { label: form.get("label") })).oneTimeSecret || ""));
  return (
    <div className="page-stack">
      {!isAdmin && <AdminOnly />}
      {secret && <Secret title="API key — shown only once. Store it now:" value={secret} notify={notify} />}
      {isAdmin && (
        <form className="panel inline-form" onSubmit={submit}>
          <label>
            Key label
            <input name="label" required maxLength={100} placeholder="e.g. Website backend" />
          </label>
          <button className="button primary" disabled={busy}>
            <Plus size={16} /> Create API key
          </button>
        </form>
      )}
      <div className="panel">
        <div className="feature-list">
          {data.apiKeys.map((key) => (
            <div className="feature-row" key={key.id}>
              <div>
                <strong>{key.label}</strong>
                <small>
                  <code>{key.prefix}…</code> · {key.lastUsedAt ? `last used ${formatDateTime(key.lastUsedAt)}` : "never used"}
                </small>
              </div>
              <span className={`badge ${key.revokedAt ? "error" : "success"}`}>{key.revokedAt ? "Revoked" : "Active"}</span>
              {isAdmin && !key.revokedAt && (
                <button className="button small danger" onClick={async () => (await ask({ title: `Revoke “${key.label}”?`, body: "Anything using this key stops working immediately. This cannot be undone.", action: "Revoke key" })) && mutate("apiKey.revoke", undefined, key.id).catch(() => {})}>
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
        {!data.apiKeys.length && <Empty icon={KeyRound} title="No API keys yet" text="Create a key to list and create QR codes from your own software." />}
      </div>
      <div className="panel stack">
        <h2>Using the API</h2>
        <p className="muted">Send your key in the <code>x-api-key</code> header. Keys act on this workspace only and respect your plan limits.</p>
        <pre className="snippet">{`# List your QR codes
curl ${data.appUrl}/api/v1/qr -H "x-api-key: YOUR_KEY"

# Create a dynamic QR code
curl -X POST ${data.appUrl}/api/v1/qr \\
  -H "x-api-key: YOUR_KEY" -H "content-type: application/json" \\
  -d '{"title":"Spring menu","targetUrl":"https://example.com/menu"}'`}</pre>
      </div>
    </div>
  );
}
