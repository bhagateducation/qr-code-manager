import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error(
    "This suite creates disposable accounts; use a local test server.",
  );
let passed = 0;
const check = (value, label) => {
  assert.ok(value, label);
  passed++;
  console.log(`PASS ${label}`);
};
async function request(path, data, cookie = "", origin = base) {
  const res = await fetch(`${base}${path}`, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      ...(data === undefined
        ? {}
        : { "content-type": "application/json", origin }),
      ...(cookie ? { cookie } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    redirect: "manual",
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = {};
  }
  return {
    status: res.status,
    headers: res.headers,
    data: json,
    text,
    cookie: res.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
const suffix = randomBytes(5).toString("hex");
const password = `Test-only-${randomBytes(16).toString("hex")}`;
const a = {
  name: "QA A",
  email: `qa-a-${suffix}@example.com`,
  workspace: "QA Workspace A",
  password,
};
const b = {
  ...a,
  name: "QA B",
  email: `qa-b-${suffix}@example.com`,
  workspace: "QA Workspace B",
};
check((await request("/api/health")).status === 200, "database health");
check(
  (await request("/dashboard")).status === 307,
  "dashboard requires authentication",
);
check(
  (await request("/api/workspace")).status === 401,
  "anonymous API read denied",
);
check(
  (await request("/api/auth/register", a, "", "https://other.example"))
    .status === 403,
  "cross-origin registration denied",
);
const ra = await request("/api/auth/register", a);
check(ra.status === 200, `register A (${ra.status}: ${ra.text})`);
const rb = await request("/api/auth/register", b);
check(rb.status === 200, "register isolated B");
check(
  ra.headers.get("set-cookie").includes("HttpOnly") &&
    /SameSite=lax/i.test(ra.headers.get("set-cookie")),
  "HttpOnly SameSite session",
);
check(
  (
    await request("/api/auth/login", {
      email: a.email,
      password: "incorrect-password",
    })
  ).status === 401,
  "wrong password denied",
);
const login = await request("/api/auth/login", { email: a.email, password });
check(login.status === 200, "correct password accepted");
const cookie = login.cookie;
check(
  (await request("/api/platform", undefined, cookie)).status === 403,
  "workspace owner cannot access platform controls",
);
const create = await request(
  "/api/workspace",
  {
    action: "qr.create",
    data: { title: "QA QR", targetUrl: "https://example.com/original" },
  },
  cookie,
);
check(create.status === 200, `persistent QR creation (${create.text})`);
const qr = create.data.entity;
const workspaceB = await request("/api/workspace", undefined, rb.cookie);
check(
  workspaceB.data.qrCodes.length === 0,
  "tenant B cannot list tenant A codes",
);
check(
  (
    await request(
      "/api/workspace",
      { action: "qr.pause", id: qr.id },
      rb.cookie,
    )
  ).status === 404,
  "tenant B cannot mutate tenant A code",
);
let scan = await request(`/s/${qr.shortCode}`);
check(
  scan.status === 302 &&
    scan.headers.get("location") === "https://example.com/original",
  "QR redirect works",
);
check(
  scan.headers.get("cache-control").includes("no-store"),
  "QR redirects not cached",
);
let state = await request("/api/workspace", undefined, cookie);
check(
  state.data.scans === 1 && state.data.logs.length === 1,
  "scan log and count persisted",
);
check(
  (
    await request(
      "/api/workspace",
      {
        action: "qr.update",
        id: qr.id,
        data: {
          title: "Updated QA QR",
          targetUrl: "https://example.com/updated",
          routingRules: { ios: "https://example.com/ios" },
        },
      },
      cookie,
    )
  ).status === 200,
  "destination update saved",
);
scan = await request(`/s/${qr.shortCode}`);
check(
  scan.headers.get("location") === "https://example.com/updated",
  "printed short code preserved",
);
const ios = await fetch(`${base}/s/${qr.shortCode}`, {
  headers: { "user-agent": "iPhone Mobile Safari" },
  redirect: "manual",
});
check(
  ios.headers.get("location") === "https://example.com/ios",
  "iOS conditional routing",
);
await request("/api/workspace", { action: "qr.pause", id: qr.id }, cookie);
check((await request(`/s/${qr.shortCode}`)).status === 410, "paused QR denied");
check(
  (await request("/s/missing-test-code")).status === 404,
  "unknown QR returns 404",
);
check(
  (
    await request(
      "/api/workspace",
      {
        action: "qr.create",
        data: { title: "Unsafe", targetUrl: "javascript:alert(1)" },
      },
      cookie,
    )
  ).status === 400,
  "unsafe URL rejected by API",
);
const system = await request(
  "/api/workspace",
  {
    action: "system.create",
    data: {
      name: "QA Inventory",
      fields: [
        { key: "stock", label: "Stock", type: "number", isRequired: true },
      ],
    },
  },
  cookie,
);
check(system.status === 200, "schema persisted");
const record = await request(
  "/api/workspace",
  {
    action: "record.create",
    data: {
      systemId: system.data.entity.id,
      title: "QA Item",
      data: { stock: 4 },
    },
  },
  cookie,
);
check(record.status === 200, "validated record persisted");
check(
  (
    await request(
      `/api/records?systemId=${system.data.entity.id}`,
      undefined,
      rb.cookie,
    )
  ).data.total === 0,
  "cross-tenant records hidden",
);
check(
  (
    await request(
      "/api/workspace",
      {
        action: "record.create",
        data: {
          systemId: system.data.entity.id,
          title: "Invalid",
          data: { stock: "wrong" },
        },
      },
      cookie,
    )
  ).status === 400,
  "record type validation enforced",
);
check(
  (await request("/api/billing/order", { plan: "pro" }, cookie)).status === 503,
  "unconfigured checkout fails closed",
);
check(
  (
    await request(
      "/api/billing/verify",
      {
        razorpay_order_id: "order_fake",
        razorpay_payment_id: "pay_fake",
        razorpay_signature: "0".repeat(64),
      },
      cookie,
    )
  ).status === 400,
  "forged payment rejected",
);
check(
  (
    await request(
      "/api/workspace",
      { action: "system.create", data: { name: "Over quota", fields: [] } },
      cookie,
    )
  ).status === 409,
  "free system quota enforced",
);
const expiring = await request(
  "/api/workspace",
  {
    action: "qr.create",
    data: {
      title: "Expired code",
      targetUrl: "https://example.com",
      routingRules: { expiresAt: "2020-01-01T00:00:00.000Z" },
    },
  },
  cookie,
);
check(
  expiring.status === 200 &&
    (await request(`/s/${expiring.data.entity.shortCode}`)).status === 410,
  "expired QR does not resolve",
);
check(
  (
    await request(
      "/api/workspace",
      {
        action: "qr.create",
        data: {
          title: "Wrong record",
          targetUrl: "https://example.com",
          recordId: record.data.entity.id,
        },
      },
      rb.cookie,
    )
  ).status === 404,
  "foreign record cannot be bound to a QR",
);
check(
  (
    await request(
      "/api/workspace",
      { action: "qr.pause", id: qr.id },
      cookie,
      "https://other.example",
    )
  ).status === 403,
  "cross-origin authenticated write denied",
);
for (let i = 0; i < 8; i++)
  check(
    (
      await request(
        "/api/workspace",
        {
          action: "qr.create",
          data: { title: `Quota test ${i}`, targetUrl: "https://example.com" },
        },
        cookie,
      )
    ).status === 200,
    `QR quota slot ${i + 3}`,
  );
check(
  (
    await request(
      "/api/workspace",
      {
        action: "qr.create",
        data: { title: "Over quota", targetUrl: "https://example.com" },
      },
      cookie,
    )
  ).status === 409,
  "free QR quota enforced",
);
check(
  (await request("/api/auth/logout", {}, cookie)).status === 200,
  "logout succeeds",
);
check(
  (await request("/api/workspace", undefined, cookie)).status === 401,
  "revoked session cannot be reused",
);
const changed = await request(
  "/api/account/password",
  { currentPassword: password, newPassword: `${password}X` },
  ra.cookie,
);
check(changed.status === 200, "password change succeeds with current password");
check(
  (await request("/api/workspace", undefined, ra.cookie)).status === 401,
  "password change revokes old sessions",
);
check(
  (await request("/api/auth/login", { email: a.email, password })).status ===
    401,
  "old password rejected after change",
);
check(
  (
    await request("/api/auth/login", {
      email: a.email,
      password: `${password}X`,
    })
  ).status === 200,
  "new password accepted",
);

// --- Deletes, roles, analytics, API keys and two-step sign-in (tenant B's session is still valid) ---
const act = (action, data, id, who = rb.cookie) => request("/api/workspace", { action, data, id }, who);
const fresh = (await request("/api/auth/login", { email: a.email, password: `${password}X` })).cookie;
const bQr = (await act("qr.create", { title: "B QR", targetUrl: "https://example.com/b" })).data.entity;
check((await act("qr.delete", undefined, bQr.id, fresh)).status === 404, "tenant A cannot delete tenant B code");
check((await act("qr.delete", undefined, bQr.id)).status === 200, "owner deletes own code");
check((await request(`/s/${bQr.shortCode}`)).status === 404, "deleted code no longer resolves");
const bSystem = (await act("system.create", { name: "B System", description: "", fields: [{ key: "note", label: "Note", type: "text", isRequired: false }] })).data.entity;
const bRecord = (await act("record.create", { systemId: bSystem.id, title: "B Record", data: { note: "x" } })).data.entity;
check((await act("record.delete", undefined, bRecord.id, fresh)).status === 404, "tenant A cannot delete tenant B record");
check((await act("system.delete", undefined, bSystem.id, fresh)).status === 404, "tenant A cannot delete tenant B system");
check((await act("record.delete", undefined, bRecord.id)).status === 200, "record delete");
check((await act("system.delete", undefined, bSystem.id)).status === 200, "system delete");
check((await request("/api/workspace/analytics?days=7")).status === 401, "anonymous analytics denied");
const report = await request("/api/workspace/analytics?days=7&offset=330", undefined, rb.cookie);
check(report.status === 200 && report.data.daily.length === 7 && report.data.heat.length === 84, "analytics report shape");
check((await act("webhook.create", { url: "https://example.com/hook", events: ["record.updated"] })).status === 400, "unsupported webhook event rejected");
check((await act("webhook.create", { url: "http://127.0.0.1/hook", events: ["scan.created"] })).status === 400, "private webhook address rejected");
const key = await act("apiKey.create", { label: "QA key" });
check(key.status === 200 && key.data.oneTimeSecret.startsWith("qrm_live_"), "owner creates API key");
const viaKey = await fetch(`${base}/api/v1/qr`, { headers: { "x-api-key": key.data.oneTimeSecret } });
check(viaKey.status === 200, "API key reads its workspace");
check((await act("apiKey.revoke", undefined, key.data.entity.id)).status === 200, "API key revoke");
check((await fetch(`${base}/api/v1/qr`, { headers: { "x-api-key": key.data.oneTimeSecret } })).status === 401, "revoked API key denied");
const invite = await act("team.invite", { email: `qa-v-${suffix}@example.com`, role: "viewer" });
const viewer = await request("/api/auth/invite/accept", { token: invite.data.oneTimeSecret, name: "QA Viewer", password });
check(viewer.status === 200 && viewer.cookie, "invitation accepted");
check((await act("qr.create", { title: "No", targetUrl: "https://example.com/no" }, undefined, viewer.cookie)).status === 403, "viewer cannot write");
check((await request("/api/account/mfa", { action: "setup" }, viewer.cookie)).status === 200, "viewer can protect own account with MFA");
check((await act("team.role", { role: "editor" }, viewer.data?.id || "x", viewer.cookie)).status === 403, "viewer cannot change roles");
const members = (await request("/api/workspace", undefined, rb.cookie)).data.members;
const viewerId = members.find((member) => member.role === "viewer").id;
check((await act("team.role", { role: "editor" }, viewerId)).status === 200, "owner promotes viewer to editor");
check((await act("apiKey.create", { label: "Editor key" }, undefined, viewer.cookie)).status === 403, "editor cannot create API keys");
check((await act("webhook.create", { url: "https://example.com/hook", events: ["scan.created"] }, undefined, viewer.cookie)).status === 403, "editor cannot create webhooks");
check((await request("/api/platform", { id: "x", plan: "business", days: 30 }, rb.cookie)).status === 403, "non-admin cannot grant plans");
const { createHmac } = await import("node:crypto");
const totp = (secret) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const keyBytes = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(Date.now() / 30000), 4);
  const digest = createHmac("sha1", keyBytes).update(counter).digest();
  const offset = digest[19] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
};
const setup = await request("/api/account/mfa", { action: "setup" }, rb.cookie);
const enabled = await request("/api/account/mfa", { action: "enable", secret: setup.data.secret, code: totp(setup.data.secret) }, rb.cookie);
check(enabled.status === 200 && enabled.data.backupCodes.length === 8, "MFA enabled with a valid code");
check((await request("/api/auth/login", { email: b.email, password })).data.mfaRequired === true, "login asks for second step");
check((await request("/api/auth/login", { email: b.email, password, mfaCode: "000000" })).status === 401, "wrong second-step code denied");
const backup = enabled.data.backupCodes[0];
check((await request("/api/auth/login", { email: b.email, password, mfaCode: backup })).status === 200, "backup code signs in");
check((await request("/api/auth/login", { email: b.email, password, mfaCode: backup })).status === 401, "backup code is single-use");
check((await request("/api/account/mfa", { action: "disable" }, rb.cookie)).status === 400, "MFA cannot be disabled without a code");
check((await request("/api/account/mfa", { action: "disable", code: totp(setup.data.secret) }, rb.cookie)).status === 200, "MFA disabled with a valid code");

// --- numbering, search, trash, bulk actions and session control ---
const n1 = (await act("qr.create", { title: "Numbered one", targetUrl: "https://example.com/n1" })).data.entity;
const n2 = (await act("qr.create", { title: "Numbered two", targetUrl: "https://example.com/n2" })).data.entity;
check(n1.number > 0 && n2.number === n1.number + 1, "codes get consecutive numbers");
const list = (query) => request(`/api/workspace?${query}`, undefined, rb.cookie);
const byNumber = await list(`search=QR-${String(n2.number).padStart(5, "0")}`);
check(byNumber.data.qrCodes.some((qr) => qr.id === n2.id), "search finds a code by its number");
check((await list("search=example.com/n1")).data.qrCodes.some((qr) => qr.id === n1.id), "search finds a code by its destination");
check((await list("sort=number&size=50")).data.pageSize === 50, "page size is honoured");
check((await act("qr.bulk", { ids: [n1.id, n2.id], op: "trash" }, undefined, viewer.cookie)).status === 200, "editor moves codes to the trash");
check(!(await list("")).data.qrCodes.some((qr) => qr.id === n1.id), "trashed code leaves the main list");
const trash = await list("status=trash");
check(trash.data.qrCodes.some((qr) => qr.id === n1.id) && trash.data.trashCount >= 2, "trashed code is listed in the trash");
check((await request(`/s/${n1.shortCode}`)).status === 404, "trashed code does not resolve");
check((await act("qr.update", { title: "x", targetUrl: "https://example.com/x" }, n1.id)).status === 404, "trashed code cannot be edited");
check((await act("qr.bulk", { ids: [n1.id], op: "purge" }, undefined, viewer.cookie)).status === 403, "editor cannot delete permanently");
check((await act("trash.empty", undefined, undefined, viewer.cookie)).status === 403, "editor cannot empty the trash");
check((await act("qr.bulk", { ids: [n1.id], op: "restore" }, undefined, fresh)).status === 200 && (await request(`/s/${n1.shortCode}`)).status === 404, "another tenant cannot restore the code");
check((await act("qr.bulk", { ids: [n1.id], op: "restore" })).status === 200, "owner restores from the trash");
check((await request(`/s/${n1.shortCode}`)).status === 302, "restored code resolves again");
check((await act("qr.bulk", { ids: [n2.id], op: "purge" })).status === 200 && !(await list("status=trash")).data.qrCodes.some((qr) => qr.id === n2.id), "owner deletes permanently");
const n3 = (await act("qr.create", { title: "Numbered three", targetUrl: "https://example.com/n3" })).data.entity;
check(n3.number === n2.number + 1, "a deleted number is never reused");
check((await act("qr.bulk", { ids: [n1.id, n3.id], op: "pause" })).status === 200 && (await request(`/s/${n3.shortCode}`)).status === 410, "bulk pause stops codes resolving");
check((await act("qr.bulk", { ids: Array.from({ length: 101 }, (_, i) => `id-${i}`), op: "pause" })).status === 400, "bulk actions are capped at 100 codes");
const second = await request("/api/auth/login", { email: b.email, password });
check((await request("/api/auth/logout-others", {}, second.cookie)).data.ended >= 1, "sign out other devices ends other sessions");
check((await request("/api/workspace", undefined, rb.cookie)).status === 401 && (await request("/api/workspace", undefined, second.cookie)).status === 200, "only the current session survives");

// --- folders (categories) and Book QR. Tenant B's live session is now `second`. ---
const me = second.cookie;
const shelf = (await act("folder.create", { name: "Maths" }, undefined, me)).data.entity;
const inner = (await act("folder.create", { name: "Algebra", parentId: shelf.id }, undefined, me)).data.entity;
check(shelf.id && inner.parentId === shelf.id, "folders nest");
check((await act("folder.create", { name: "Intruder", parentId: shelf.id }, undefined, fresh)).status === 404, "tenant A cannot create inside tenant B's folder");
const foreign = (await act("folder.create", { name: "A folder" }, undefined, fresh)).data.entity;
check((await act("qr.create", { title: "Wrong shelf", targetUrl: "https://example.com/w", folderId: foreign.id }, undefined, me)).status === 404, "a code cannot be filed in another tenant's folder");
check((await act("qr.bulk", { ids: [n1.id], op: "move", folderId: foreign.id }, undefined, me)).status === 404, "codes cannot be moved to another tenant's folder");
check((await act("qr.bulk", { ids: [n1.id], op: "move", folderId: inner.id }, undefined, me)).status === 200, "bulk move files a code");
const listB = (query) => request(`/api/workspace?${query}`, undefined, me);
check((await listB(`folder=${shelf.id}`)).data.qrCodes.some((qr) => qr.id === n1.id), "a folder lists codes from its sub-folders");
check(!(await listB("folder=none")).data.qrCodes.some((qr) => qr.id === n1.id), "the unfiled view leaves filed codes out");
check((await act("folder.delete", undefined, shelf.id, fresh)).status === 404, "tenant A cannot delete tenant B's folder");
check((await act("folder.delete", undefined, shelf.id, me)).status === 200, "folder delete");
const afterDelete = await listB("folder=none");
check(afterDelete.data.qrCodes.some((qr) => qr.id === n1.id) && !afterDelete.data.folders.some((folder) => folder.id === inner.id), "deleting a folder keeps its codes and removes sub-folders");
const book = await act("book.create", { title: "Army GD Maths", urlTemplate: "https://example.com/book/{chapter}/{question}", chapters: [{ name: "Number system", questions: 2 }, { name: "Percentage", questions: 2 }] }, undefined, me);
check(book.status === 200, `book creation (${book.text})`);
const bookCodes = (await listB(`folder=${book.data.entity.id}&sort=number`)).data;
check(bookCodes.total === 4 && bookCodes.qrCodes[3].number === bookCodes.qrCodes[0].number + 3, "a book creates one numbered code per question");
check(bookCodes.qrCodes[3].targetUrl === "https://example.com/book/2/2" && bookCodes.qrCodes[3].title === "Percentage · Q2", "book links and titles follow chapter and question");
check(bookCodes.folders.filter((folder) => folder.parentId === book.data.entity.id && folder.kind === "chapter").length === 2, "a book creates a folder per chapter");
check((await request(`/s/${bookCodes.qrCodes[0].shortCode}`)).status === 302, "a book code resolves");
const sheet = await request(`/api/workspace/export?kind=sheet&folder=${book.data.entity.id}`, undefined, me);
check(sheet.data.codes.length === 4 && sheet.data.codes[0].payload.includes("/s/"), "print sheet lists the book's codes");
check((await request(`/api/workspace/export?kind=sheet&folder=${book.data.entity.id}`, undefined, fresh)).status === 404, "tenant A cannot read tenant B's print sheet");
check((await act("book.create", { title: "Too big", urlTemplate: "https://example.com/{chapter}/{question}", chapters: [{ name: "One", questions: 200 }] }, undefined, me)).status === 409, "a book cannot exceed the plan's code limit");
check((await act("book.create", { title: "Bad link", urlTemplate: "http://127.0.0.1/{chapter}/{question}", chapters: [{ name: "One", questions: 1 }] }, undefined, me)).status === 400, "a book link must be a public address");

// --- SaaS platform: link stability, platform owner, plans, payments, panels, storage, domains ---
const stable = (await act("qr.create", { title: "Stable", targetUrl: "https://example.com/first" }, undefined, me)).data.entity;
await act("qr.update", { title: "Stable renamed", targetUrl: "https://example.com/second" }, stable.id, me);
const afterEdit = (await listB("search=Stable")).data.qrCodes.find((qr) => qr.id === stable.id);
const hop = await request(`/s/${stable.shortCode}`);
check(afterEdit.shortCode === stable.shortCode && afterEdit.number === stable.number && hop.headers.get("location") === "https://example.com/second", "changing a link keeps the same QR code and redirects to the new link");

// A platform owner for the test, made directly in the local database.
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();
const p = { ...a, name: "QA Platform", email: `qa-p-${suffix}@example.com`, workspace: "QA Platform" };
const rp = await request("/api/auth/register", p);
await db.user.update({ where: { email: p.email }, data: { platformAdmin: true } });
const ownerView = await request("/api/workspace", undefined, rp.cookie);
check(ownerView.data.workspace.plan === "owner" && ownerView.data.limits.codes === null && ownerView.data.limits.storageMb === null, "the platform owner has no limits");
const bView = await listB("");
check(bView.data.limits.codes === 10 && bView.data.limits.storageMb === 1024, "a new client gets the Free plan with 1 GB storage");
const bId = bView.data.workspace.id;
const platform = (action, data, id, who = rp.cookie) => request("/api/platform", { action, data, id }, who);
check((await request("/api/platform", undefined, rp.cookie)).data.clients.some((client) => client.id === bId), "the platform owner sees every client");
check((await platform("client.plan", { plan: "pro", days: 30 }, bId, me)).status === 403, "a client cannot change plans");
check((await platform("client.plan", { plan: "pro", days: 30 }, bId)).status === 200 && (await listB("")).data.workspace.plan === "pro", "the owner puts a client on a plan");
const before = Date.parse((await listB("")).data.workspace.paidUntil);
await platform("client.extend", 30, bId);
check(Date.parse((await listB("")).data.workspace.paidUntil) - before >= 29 * 86400000, "the owner extends a subscription");
check((await platform("client.payment", { amount: 499, method: "upi", note: "QA", plan: "pro", days: 0 }, bId)).status === 200, "the owner records a manual payment");
check((await request("/api/platform", undefined, rp.cookie)).data.clients.find((client) => client.id === bId).payments.some((payment) => payment.amount === 49900 && payment.method === "upi"), "the payment is in the client's history");
check((await platform("client.limits", { codes: 999, allowApi: false }, bId)).status === 200 && (await listB("")).data.limits.codes === 999, "the owner sets custom limits for one client");
check((await act("apiKey.create", { label: "Blocked" }, undefined, me)).status === 403, "a feature switched off for a client is refused");
await platform("client.limits", { storageMb: 0 }, bId);
check((await act("qr.create", { title: "Too big", targetUrl: "https://example.com/full" }, undefined, me)).status === 409, "a client whose storage is full cannot add codes");
await platform("client.limits", {}, bId);
check((await listB("")).data.limits.codes === 500, "clearing custom limits returns the client to their plan");
const planSave = await platform("plan.save", { id: `qa-${suffix}`, name: "QA plan", description: null, pricePaise: 9900, days: 7, codes: 5, systems: 1, records: 10, storageMb: 100, panels: null, members: 2, allowApi: false, allowBooks: true, allowDomain: false, isPublic: false, sort: 99 });
check(planSave.status === 200, "the owner creates a plan");
check((await platform("plan.delete", undefined, `qa-${suffix}`)).status === 200 && (await platform("plan.delete", undefined, "free")).status === 400, "plans can be deleted, except Free");
check((await platform("maintenance.run")).status === 200, "reminders and domain checks can be run on demand");

// Panels for a client's teams.
const panel = await act("panel.create", "QA Branch", undefined, me);
check(panel.status === 200, "a client owner creates a panel");
check((await act("panel.create", "Not mine", undefined, viewer.cookie)).status === 403, "a member cannot create panels");
check((await request("/api/auth/switch", { workspaceId: panel.data.entity.id }, fresh)).status === 404, "another client cannot open the panel");
await request("/api/auth/switch", { workspaceId: panel.data.entity.id }, me);
const inPanel = await listB("");
check(inPanel.data.workspace.isPanel && inPanel.data.workspace.id === panel.data.entity.id, "the owner works inside the panel");
const panelCode = (await act("qr.create", { title: "Panel code", targetUrl: "https://example.com/panel" }, undefined, me)).data.entity;
await request("/api/auth/switch", { workspaceId: null }, me);
const home = await listB("search=Panel code");
check(!home.data.qrCodes.some((qr) => qr.id === panelCode.id) && home.data.usage.codes === inPanel.data.usage.codes + 1, "panel codes stay in the panel but count toward the account's plan");
await request("/api/auth/switch", { workspaceId: bId }, rp.cookie);
check((await request("/api/workspace", undefined, rp.cookie)).data.workspace.id === bId, "the platform owner can open a client's panel");
await request("/api/auth/switch", { workspaceId: null }, rp.cookie);

// Duplicate, CSV import and custom domain.
const copy = await act("qr.duplicate", undefined, stable.id, me);
check(copy.status === 200 && copy.data.entity.number > stable.number && copy.data.entity.shortCode !== stable.shortCode, "duplicating makes a new numbered code");
const imported = await act("qr.import", [{ title: "Row one", url: "https://example.com/r1", folder: "Imported" }, { title: "Row two", url: "https://example.com/r2" }], undefined, me);
check(imported.status === 200 && (await listB("search=Row")).data.total === 2 && (await listB("")).data.folders.some((folder) => folder.name === "Imported"), "a CSV import creates codes and their folder");
check((await act("qr.import", [{ title: "Bad", url: "http://127.0.0.1/x" }], undefined, me)).status === 400, "an import with an unsafe link is refused");
await platform("client.plan", { plan: "free" }, bId);
const domainName = "qr-" + suffix + ".example.com";
check((await act("domain.save", domainName, undefined, me)).status === 403, "custom domains need a plan that allows them");
await platform("client.limits", { allowDomain: true }, bId);
check((await act("domain.save", domainName, undefined, me)).status === 200 && (await listB("")).data.domain.status === "pending", "a client adds a custom domain");
check((await act("domain.use", true, undefined, me)).status === 409 && (await listB("")).data.linkBase === base, "an unverified domain is never printed in QR codes");
// Only one platform owner may exist; take the test one away again.
await db.user.update({ where: { email: p.email }, data: { platformAdmin: false } });
await db.$disconnect();
console.log(`${passed} integration checks passed.`);
