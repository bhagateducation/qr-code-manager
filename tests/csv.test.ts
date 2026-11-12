import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../lib/csv";

test("CSV import reads quotes, escaped quotes, CRLF and skips blank lines", () => {
  const rows = parseCsv('title,url,folder\r\n"Menu, summer",https://example.com/a,Food\n\n"Say ""hi""",https://example.com/b,\nLast,https://example.com/c');
  assert.deepEqual(rows, [
    ["title", "url", "folder"],
    ["Menu, summer", "https://example.com/a", "Food"],
    ['Say "hi"', "https://example.com/b", ""],
    ["Last", "https://example.com/c"],
  ]);
  assert.deepEqual(parseCsv(""), []);
});
