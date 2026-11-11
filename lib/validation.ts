import { z } from "zod";
export const destination = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => {
    try {
      const url = new URL(value),
        host = url.hostname.toLowerCase();
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        host.includes(".") &&
        !host.endsWith(".local") &&
        !host.endsWith(".localhost") &&
        !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
          host,
        ) &&
        !host.includes(":")
      );
    } catch {
      return false;
    }
  }, "Use a public http or https address without embedded credentials.");
export const name = z.string().trim().min(1).max(100);
export const password = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(72)
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Password must be no more than 72 UTF-8 bytes.",
  );
export const email = z.string().trim().toLowerCase().max(190).pipe(z.email());
export const fieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  label: name,
  type: z.enum(["text", "number", "date", "url", "boolean"]),
  isRequired: z.boolean().default(false),
});
export const systemSchema = z
  .object({
    name,
    description: z.string().max(500).default(""),
    fields: z.array(fieldSchema).max(30),
  })
  .refine(
    (s) => new Set(s.fields.map((f) => f.key)).size === s.fields.length,
    "Field keys must be unique.",
  );
export const qrSchema = z.object({
  title: name,
  type: z.enum(["dynamic_url", "wifi", "vcard", "text"]).default("dynamic_url"),
  targetUrl: z.string().trim().min(1).max(4096),
  recordId: z.string().max(80).nullable().optional(),
  campaignId: z.string().max(80).nullable().optional(),
  folderId: z.string().max(80).nullable().optional(),
  tagIds: z.array(z.string().max(80)).max(20).default([]),
  isActive: z.boolean().default(true),
  styling: z
    .object({
      dark: z.enum(["#17161D", "#5B43D6", "#124D35", "#173D70"]),
      light: z.literal("#FFFFFF"),
      errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]),
    })
    .default({ dark: "#17161D", light: "#FFFFFF", errorCorrectionLevel: "M" }),
  routingRules: z
    .object({
      ios: destination.optional(),
      android: destination.optional(),
      expiresAt: z.iso.datetime().optional(),
    })
    .default({}),
}).superRefine((value, context) => {
  if (value.type === "dynamic_url") {
    const result = destination.safeParse(value.targetUrl);
    if (!result.success) context.addIssue({ code: "custom", path: ["targetUrl"], message: result.error.issues[0]?.message || "Use a public http or https address." });
    return;
  }
  if (value.type === "wifi" && !/^WIFI:T:(WPA|WEP|nopass);S:.+;P:.*;H:(true|false);;$/.test(value.targetUrl))
    context.addIssue({ code: "custom", path: ["targetUrl"], message: "Wi-Fi payload is invalid." });
  if (value.type === "vcard" && !/^BEGIN:VCARD\nVERSION:3\.0\n[\s\S]+\nEND:VCARD$/.test(value.targetUrl))
    context.addIssue({ code: "custom", path: ["targetUrl"], message: "vCard payload is invalid." });
});
export function validateRecord(
  fields: { key: string; type: string; isRequired: boolean }[],
  input: unknown,
) {
  const data = z
    .record(
      z.string(),
      z.union([
        z.string().max(4000),
        z.number().finite(),
        z.boolean(),
        z.null(),
      ]),
    )
    .parse(input);
  if (Object.keys(data).some((key) => !fields.some((f) => f.key === key)))
    throw new Error("Unknown record field.");
  for (const field of fields) {
    const value = data[field.key];
    if (value === undefined || value === null || value === "") {
      if (field.isRequired) throw new Error(`${field.key} is required.`);
      continue;
    }
    if (field.type === "number" && typeof value !== "number")
      throw new Error(`${field.key} must be a number.`);
    if (field.type === "boolean" && typeof value !== "boolean")
      throw new Error(`${field.key} must be true or false.`);
    if (field.type === "url") destination.parse(value);
    if (
      field.type === "date" &&
      (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(value)))
    )
      throw new Error(`${field.key} must be a date.`);
    if (field.type === "text" && typeof value !== "string")
      throw new Error(`${field.key} must be text.`);
  }
  return data;
}
export function effectivePlan(workspace: {
  plan: string;
  paidUntil: Date | null;
}) {
  return workspace.paidUntil &&
    workspace.paidUntil > new Date() &&
    ["pro", "business"].includes(workspace.plan)
    ? workspace.plan
    : "free";
}
export const limits: Record<
  string,
  { codes: number; systems: number; records: number }
> = {
  free: { codes: 10, systems: 1, records: 50 },
  pro: { codes: 500, systems: 10, records: 5000 },
  business: { codes: 2500, systems: 50, records: 25000 },
};
