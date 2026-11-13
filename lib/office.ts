import "server-only";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "./prisma";
import { ApiError } from "./http";
import { parseCsv } from "./csv";

export type ImportRow = { number?: number; title: string; url?: string; folder?: string };
const HEADERS = ["QR number", "Title", "Link", "Folder"];
const qrNumber = (value: number) => `QR-${String(value).padStart(5, "0")}`;
const MAX_WITH_IMAGES = 2000;

function file(data: ArrayBuffer | Buffer | Uint8Array, name: string, type: string) {
  return new NextResponse(new Uint8Array(data as ArrayBuffer), { headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
}
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Codes of the workspace (or one folder and its sub-folders), folder by folder in manual order, each with its QR image. */
export async function officeExport(kind: "xlsx" | "docx", workspaceId: string, base: string, folder: string | null) {
  const folders = await prisma.folder.findMany({ where: { workspaceId }, select: { id: true, parentId: true, name: true, position: true, createdAt: true } });
  const path = (id: string | null): string => {
    const item = folders.find((entry) => entry.id === id);
    return item ? [path(item.parentId), item.name].filter(Boolean).join(" / ") : "";
  };
  let scope: string[] | undefined;
  if (folder) {
    if (!folders.some((item) => item.id === folder)) throw new ApiError(404, "Folder not found.");
    scope = [folder];
    for (const id of scope) scope.push(...folders.filter((item) => item.parentId === id).map((item) => item.id));
  }
  // Folders in tree order (parents first, siblings by their manual order), unfiled codes last.
  const order: (string | null)[] = [];
  const visit = (parentId: string | null) =>
    folders
      .filter((item) => item.parentId === parentId)
      .sort((a, b) => a.position - b.position || +a.createdAt - +b.createdAt)
      .forEach((item) => (order.push(item.id), visit(item.id)));
  visit(null);
  order.push(null);
  const codes = await prisma.qRCode.findMany({
    where: { workspaceId, deletedAt: null, ...(scope ? { folderId: { in: scope } } : {}) },
    orderBy: [{ position: "asc" }, { number: "asc" }],
    take: MAX_WITH_IMAGES + 1,
    select: { number: true, title: true, type: true, shortCode: true, targetUrl: true, isActive: true, scanCount: true, folderId: true },
  });
  if (codes.length > MAX_WITH_IMAGES) throw new ApiError(413, `Exports with images hold up to ${MAX_WITH_IMAGES.toLocaleString()} codes. Export one folder at a time, or use CSV.`);
  codes.sort((a, b) => order.indexOf(a.folderId) - order.indexOf(b.folderId));
  const rows = await Promise.all(
    codes.map(async (qr) => {
      const payload = qr.type === "dynamic_url" ? `${base}/s/${qr.shortCode}` : qr.targetUrl;
      // 360 px at 2.5 cm is about 360 dpi: sharp in print, small in the file.
      const image = await QRCode.toBuffer(payload, { width: 360, margin: 2, errorCorrectionLevel: "M" });
      const waiting = qr.targetUrl.endsWith(`/q/${qr.shortCode}`);
      return { ...qr, folder: path(qr.folderId), payload, image, link: qr.type === "dynamic_url" ? (waiting ? "" : qr.targetUrl) : "" };
    }),
  );
  const title = folder ? path(folder).split(" / ").at(-1)! : "QR codes";
  const filename = `${title.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 60) || "qr-codes"}.${kind}`;

  if (kind === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet("QR codes", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
      { header: "Sr.", key: "sr", width: 6 },
      { header: "QR number", key: "number", width: 12 },
      { header: "Folder", key: "folder", width: 28 },
      { header: "Title", key: "title", width: 34 },
      { header: "Link", key: "link", width: 40 },
      { header: "QR image", key: "image", width: 16 },
      { header: "Scan link", key: "payload", width: 34 },
      { header: "Status", key: "status", width: 10 },
      { header: "Scans", key: "scans", width: 8 },
    ];
    sheet.getRow(1).font = { bold: true };
    rows.forEach((row, index) => {
      const line = sheet.addRow({ sr: index + 1, number: qrNumber(row.number), folder: row.folder, title: row.title, link: row.link, payload: row.payload, status: row.isActive ? "Active" : "Paused", scans: row.scanCount });
      line.height = 82;
      line.alignment = { vertical: "middle", wrapText: true };
      sheet.addImage(book.addImage({ buffer: row.image as unknown as ArrayBuffer, extension: "png" }), { tl: { col: 5.1, row: index + 1.05 }, ext: { width: 100, height: 100 } });
    });
    return file(await book.xlsx.writeBuffer(), filename, XLSX);
  }

  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, HeadingLevel, WidthType, AlignmentType } = await import("docx");
  const cell = (children: InstanceType<typeof Paragraph>[], width: number) => new TableCell({ children, width: { size: width, type: WidthType.PERCENTAGE }, verticalAlign: "center" });
  const head = (text: string) => new Paragraph({ children: [new TextRun({ text, bold: true })] });
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [new Paragraph({ text: title, heading: HeadingLevel.TITLE })];
  for (const group of [...new Set(rows.map((row) => row.folder))]) {
    children.push(new Paragraph({ text: group || "Not in a folder", heading: HeadingLevel.HEADING_2 }));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: [cell([head("Sr.")], 7), cell([head("Title")], 38), cell([head("QR code")], 20), cell([head("Link")], 35)] }),
          ...rows
            .filter((row) => row.folder === group)
            .map(
              (row, index) =>
                new TableRow({
                  cantSplit: true,
                  children: [
                    cell([new Paragraph(String(index + 1))], 7),
                    cell([new Paragraph({ children: [new TextRun({ text: row.title, bold: true })] }), new Paragraph({ children: [new TextRun({ text: qrNumber(row.number), size: 18, color: "666666" })] })], 38),
                    cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "png", data: row.image, transformation: { width: 96, height: 96 } })] })], 20),
                    cell([new Paragraph({ children: [new TextRun({ text: row.link || row.payload, size: 18 })] })], 35),
                  ],
                }),
            ),
        ],
      }),
    );
  }
  return file(await Packer.toBuffer(new Document({ sections: [{ children }] })), filename, DOCX);
}

/** A blank file in the import format, with two example rows. */
export async function officeTemplate(kind: "xlsx" | "docx") {
  const examples = [
    ["", "Chapter 1 · Q1", "https://example.com/maths/1/1", "Maths Book / Chapter 1"],
    ["", "Chapter 1 · Q2", "", "Maths Book / Chapter 1"],
  ];
  if (kind === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet("Import");
    sheet.columns = HEADERS.map((header, i) => ({ header, key: String(i), width: [12, 34, 44, 30][i] }));
    sheet.getRow(1).font = { bold: true };
    examples.forEach((row) => sheet.addRow(row));
    const help = book.addWorksheet("How to fill");
    [
      "One row per QR code. Only Title is required.",
      "QR number: leave empty for a new code. Put an existing number (e.g. QR-00042) to change that code's title and link.",
      "Link: where the code opens. Leave empty to add it later; the code shows its own page until then.",
      "Folder: a folder name, or a path such as Book / Chapter 1. Missing folders are created.",
    ].forEach((line) => help.addRow([line]));
    help.getColumn(1).width = 110;
    return file(await book.xlsx.writeBuffer(), "qr-import-format.xlsx", XLSX);
  }
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType } = await import("docx");
  const row = (values: string[], bold = false) => new TableRow({ children: values.map((value) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: value, bold })] })] })) });
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph("Fill one row per QR code in this table, then import the file. Only Title is required. Leave QR number empty for new codes; put an existing number to update that code."),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [row(HEADERS, true), ...examples.map((values) => row(values))] }),
        ],
      },
    ],
  });
  return file(await Packer.toBuffer(doc), "qr-import-format.docx", DOCX);
}

/** Reads rows from a CSV, Excel or Word file in the import format. Columns are found by their header names. */
export async function parseImport(name: string, data: Buffer): Promise<ImportRow[]> {
  let table: string[][] = [];
  if (/\.csv$/i.test(name)) table = parseCsv(data.toString("utf8"));
  else if (/\.xlsx$/i.test(name)) {
    const { default: ExcelJS } = await import("exceljs");
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(data as unknown as ArrayBuffer);
    const sheet = book.worksheets[0];
    sheet?.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const value = cell.value as unknown;
        values[col - 1] = value && typeof value === "object" ? String((value as { text?: string; hyperlink?: string; result?: unknown }).text ?? (value as { hyperlink?: string }).hyperlink ?? (value as { result?: unknown }).result ?? "") : String(value ?? "");
      });
      table.push(Array.from(values, (value) => value ?? ""));
    });
  } else if (/\.docx$/i.test(name)) {
    const { default: JSZip } = await import("jszip");
    const xml = (await (await JSZip.loadAsync(data)).file("word/document.xml")?.async("string")) || "";
    const text = (part: string) =>
      [...part.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((match) => match[1]).join("").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
    table = [...xml.matchAll(/<w:tr[\s>][\s\S]*?<\/w:tr>/g)].map((row) => [...row[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((cell) => text(cell[0])));
  } else throw new ApiError(400, "Use a CSV, Excel (.xlsx) or Word (.docx) file.");

  const at = table.findIndex((row) => row.some((cell) => /^(title|question|name)$/i.test(cell.trim())));
  // Files without a header row are read as title, link, folder (the old CSV format).
  const header = at >= 0 ? table[at].map((cell) => cell.trim().toLowerCase()) : ["title", "link", "folder"];
  const col = (...names: string[]) => header.findIndex((cell) => names.includes(cell));
  const c = { number: col("qr number", "number", "qr no", "qr no."), title: col("title", "question", "name"), url: col("link", "url", "destination"), folder: col("folder", "folder path", "chapter") };
  return table
    .slice(at + 1)
    .map((row) => ({
      number: c.number >= 0 ? Number(/(\d+)\s*$/.exec(row[c.number] || "")?.[1]) || undefined : undefined,
      title: (row[c.title] || "").trim().slice(0, 100),
      url: c.url >= 0 ? (row[c.url] || "").trim() || undefined : undefined,
      folder: c.folder >= 0 ? (row[c.folder] || "").trim() || undefined : undefined,
    }))
    .filter((row) => row.title);
}
