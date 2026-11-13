import assert from "node:assert";
import { test } from "node:test";
import { officeTemplate, parseImport } from "../lib/office";

for (const kind of ["xlsx", "docx"] as const)
  test(`the ${kind} import format reads back`, async () => {
    const file = Buffer.from(await (await officeTemplate(kind)).arrayBuffer());
    assert.deepStrictEqual(await parseImport(`format.${kind}`, file), [
      { number: undefined, title: "Chapter 1 · Q1", url: "https://example.com/maths/1/1", folder: "Maths Book / Chapter 1" },
      { number: undefined, title: "Chapter 1 · Q2", url: undefined, folder: "Maths Book / Chapter 1" },
    ]);
  });

test("a CSV without a header keeps the old title, link, folder order", async () => {
  assert.deepStrictEqual(await parseImport("a.csv", Buffer.from("Q1,https://x.com/1,Book\n")), [{ number: undefined, title: "Q1", url: "https://x.com/1", folder: "Book" }]);
});

test("a QR number column updates existing codes", async () => {
  const rows = await parseImport("a.csv", Buffer.from("QR number,Title,Link\nQR-00042,Renamed,https://x.com/new\n"));
  assert.strictEqual(rows[0].number, 42);
});
