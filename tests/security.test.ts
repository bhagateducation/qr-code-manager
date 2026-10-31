import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import {
  destination,
  qrSchema,
  systemSchema,
  validateRecord,
  effectivePlan,
} from "../lib/validation";
import { validSignature } from "../lib/payment-signature";
import { buildVCardPayload, buildWifiPayload } from "../lib/qr-payload";

test("redirect validation rejects script, credentials, private destinations and encoded loopbacks", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,test",
    "https://user:pass@example.com",
    "http://localhost",
    "http://127.0.0.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://10.0.0.1",
    "http://192.168.1.2",
    "http://172.16.0.1",
    "http://169.254.169.254",
    "http://[::1]",
  ])
    assert.equal(destination.safeParse(value).success, false, value);
  assert.equal(
    destination.safeParse("https://example.com/path?q=hello").success,
    true,
  );
});
test("schemas reject duplicate fields and records enforce field types", () => {
  const fields = [
    { key: "stock", label: "Stock", type: "number", isRequired: true },
  ];
  assert.equal(
    systemSchema.safeParse({ name: "Test", fields: [...fields, ...fields] })
      .success,
    false,
  );
  assert.throws(() => validateRecord(fields, { stock: "one" }));
  assert.throws(() => validateRecord(fields, {}));
  assert.throws(() =>
    validateRecord(fields, { stock: 1, unauthorized: "value" }),
  );
  assert.deepEqual(validateRecord(fields, { stock: 0 }), { stock: 0 });
});
test("native Wi-Fi and vCard payloads validate without weakening dynamic URL checks", () => {
  const wifi = buildWifiPayload({ ssid: "Guest;Network", password: "p:a\\ss", security: "WPA", hidden: false });
  const vcard = buildVCardPayload({ name: "Asha; Rao", organization: "QR Manager", phone: "+91 99999 00000", email: "asha@example.com", url: "https://example.com" });
  assert.equal(qrSchema.safeParse({ title: "Guest Wi-Fi", type: "wifi", targetUrl: wifi }).success, true);
  assert.equal(qrSchema.safeParse({ title: "Contact", type: "vcard", targetUrl: vcard }).success, true);
  assert.equal(qrSchema.safeParse({ title: "Broken", type: "wifi", targetUrl: "https://example.com" }).success, false);
  assert.equal(qrSchema.safeParse({ title: "Broken", type: "dynamic_url", targetUrl: "WIFI:T:nopass;S:test;P:;H:false;;" }).success, false);
});
test("expired plans never retain paid entitlements", () => {
  assert.equal(effectivePlan({ plan: "pro", paidUntil: new Date(0) }), "free");
  assert.equal(effectivePlan({ plan: "business", paidUntil: null }), "free");
  assert.equal(
    effectivePlan({ plan: "pro", paidUntil: new Date(Date.now() + 60000) }),
    "pro",
  );
});
test("payment signatures reject tampering, invalid length and wrong secrets", () => {
  const payload = "order_test|pay_test",
    secret = "test-only-secret";
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  assert.equal(validSignature(payload, signature, secret), true);
  assert.equal(validSignature(payload + "x", signature, secret), false);
  assert.equal(validSignature(payload, signature, "other"), false);
  assert.equal(validSignature(payload, "abcd", secret), false);
});
test("every supported colour and correction level produces a decodable PNG and vector SVG", async () => {
  const payload =
    "https://rosybrown-narwhal-127133.hostingersite.com/s/test-qr-123";
  for (const dark of ["#17161D", "#5B43D6", "#124D35", "#173D70"])
    for (const errorCorrectionLevel of ["L", "M", "Q", "H"] as const) {
      const options = {
        width: 768,
        margin: 4,
        color: { dark, light: "#FFFFFF" },
        errorCorrectionLevel,
      };
      const png = PNG.sync.read(await QRCode.toBuffer(payload, options));
      assert.equal(
        jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
        payload,
      );
      const svg = await QRCode.toString(payload, { ...options, type: "svg" });
      assert.match(svg, /<path/);
      assert.doesNotMatch(svg, /<image|data:image/);
    }
});
