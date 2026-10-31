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
console.log(`${passed} integration checks passed.`);
