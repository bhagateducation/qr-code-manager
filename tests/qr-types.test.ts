import assert from "node:assert/strict";
import test from "node:test";
import { QR_TYPES } from "../lib/qr-types";

const build = (id: string, values: Record<string, string>) => QR_TYPES.find((tool) => tool.id === id)!.build!(values);

test("QR tools build safe destination links", () => {
  assert.equal(build("whatsapp", { phone: "+91 98765-43210", message: "Hi & hello" }), "https://wa.me/919876543210?text=Hi%20%26%20hello");
  assert.equal(build("whatsapp", { phone: "abc" }), "");
  assert.equal(build("location", { place: "MG Road, Jaipur" }), "https://www.google.com/maps/search/?api=1&query=MG%20Road%2C%20Jaipur");
  assert.equal(build("review", { placeId: " ChIJ&x " }), "https://search.google.com/local/writereview?placeid=ChIJ%26x");
  assert.equal(new Set(QR_TYPES.map((tool) => tool.id)).size, QR_TYPES.length);
});
