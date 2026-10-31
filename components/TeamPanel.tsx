"use client";

import { FormEvent, useState } from "react";
import { Copy, Mail, Trash2, UserPlus } from "lucide-react";

export default function TeamPanel({ data, canWrite, mutate }: any) {
  const [inviteLink, setInviteLink] = useState("");
  const [busy, setBusy] = useState(false);
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await mutate("team.invite", { email: form.get("email"), role: form.get("role") });
      if (result.oneTimeSecret) setInviteLink(`${window.location.origin}/invite?token=${encodeURIComponent(result.oneTimeSecret)}`);
      event.currentTarget.reset();
    } finally { setBusy(false); }
  }
  const isOwner = data.user.role === "owner";
  return <div className="stack">
    <div className="panel-heading"><div><h2>Team & roles</h2><p className="muted">Invite workspace members with scoped permissions. Invite links expire after seven days.</p></div></div>
    {inviteLink && <div className="notice"><strong>Copy this invite link:</strong><code className="secret-value">{inviteLink}</code><button className="button small" onClick={() => navigator.clipboard.writeText(inviteLink)}><Copy size={14} /> Copy</button></div>}
    {isOwner && <div className="panel"><form className="row-actions" onSubmit={invite}><input name="email" type="email" required placeholder="member@example.com" /><select name="role" defaultValue="editor"><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button className="button primary" disabled={busy}><UserPlus size={16} /> Send invite link</button></form></div>}
    <div className="panel"><div className="feature-list">{data.members.map((member: any) => <div className="feature-row" key={member.id}><div><strong>{member.name}</strong><small>{member.email}</small></div>{isOwner && member.id !== data.user.id ? <><select value={member.role} onChange={(event) => mutate("team.role", { role: event.target.value }, member.id)}><option>admin</option><option>editor</option><option>viewer</option></select><button className="icon-button" aria-label={`Remove ${member.name}`} onClick={() => mutate("team.remove", undefined, member.id)}><Trash2 size={15} /></button></> : <span className="badge">{member.role}</span>}</div>)}{!data.members.length && <p className="empty">No workspace members yet.</p>}</div></div>
    <div className="panel"><div className="panel-heading"><div><h2>Pending invitations</h2><p className="muted">Only the invited email can accept a link.</p></div></div><div className="feature-list">{data.invitations.map((inviteItem: any) => <div className="feature-row" key={inviteItem.id}><div><strong>{inviteItem.email}</strong><small>{inviteItem.role} · expires {new Date(inviteItem.expiresAt).toLocaleDateString()}</small></div>{isOwner && <button className="button small" onClick={() => mutate("invitation.revoke", undefined, inviteItem.id)}><Mail size={14} /> Revoke</button>}</div>)}{!data.invitations.length && <p className="empty">No pending invitations.</p>}</div></div>
  </div>;
}
