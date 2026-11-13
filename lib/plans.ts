import "server-only";
import type { Prisma, PrismaClient, Workspace } from "@prisma/client";
import { ApiError } from "./http";
import { effectivePlan } from "./validation";

type Db = PrismaClient | Prisma.TransactionClient;
/** Numbers are maximums; null means unlimited. */
export type Limits = {
  codes: number | null;
  systems: number | null;
  records: number | null;
  storageMb: number | null;
  panels: number | null;
  members: number | null;
  allowApi: boolean;
  allowBooks: boolean;
  allowDomain: boolean;
};
export const LIMIT_KEYS = ["codes", "systems", "records", "storageMb", "panels", "members"] as const;
export const FEATURE_KEYS = ["allowApi", "allowBooks", "allowDomain"] as const;
const UNLIMITED: Limits = { codes: null, systems: null, records: null, storageMb: null, panels: null, members: null, allowApi: true, allowBooks: true, allowDomain: true };
// Used only if the plans table is somehow empty.
const FALLBACK: Limits = { codes: 1, systems: 1, records: 50, storageMb: 1024, panels: 0, members: 3, allowApi: false, allowBooks: false, allowDomain: false };

const pick = (source: Record<string, unknown>): Partial<Limits> =>
  Object.fromEntries([...LIMIT_KEYS, ...FEATURE_KEYS].filter((key) => key in source).map((key) => [key, source[key]]));

/** The billing account a workspace belongs to: the client's main workspace and all its panels. */
export async function account(db: Db, workspace: Workspace) {
  const root = workspace.parentId ? await db.workspace.findUniqueOrThrow({ where: { id: workspace.parentId } }) : workspace;
  const panels = await db.workspace.findMany({ where: { parentId: root.id }, select: { id: true }, orderBy: { createdAt: "asc" } });
  const planId = effectivePlan(root);
  let limits = UNLIMITED;
  if (planId !== "owner") {
    const plan = (await db.plan.findUnique({ where: { id: planId } })) || (await db.plan.findUnique({ where: { id: "free" } }));
    limits = { ...FALLBACK, ...(plan ? pick(plan) : {}), ...pick((root.customLimits as Record<string, unknown>) || {}) };
  }
  return { root, ids: [root.id, ...panels.map((panel) => panel.id)], planId, limits };
}

/** What an account currently uses. */
export async function usage(db: Db, ids: string[]) {
  const [codes, allCodes, systems, records, folders, members, invites, scans] = await Promise.all([
    db.qRCode.count({ where: { workspaceId: { in: ids }, deletedAt: null } }),
    db.qRCode.count({ where: { workspaceId: { in: ids } } }),
    db.system.count({ where: { workspaceId: { in: ids } } }),
    db.record.count({ where: { system: { workspaceId: { in: ids } } } }),
    db.folder.count({ where: { workspaceId: { in: ids } } }),
    db.user.count({ where: { workspaceId: { in: ids } } }),
    db.invitation.count({ where: { workspaceId: { in: ids }, acceptedAt: null, expiresAt: { gt: new Date() } } }),
    db.scanLog.count({ where: { qrCode: { workspaceId: { in: ids } } } }),
  ]);
  return { codes, systems, records, folders, members, invites, scans, panels: ids.length - 1, storageBytes: storageOf({ codes: allCodes, records, scans, folders, systems }) };
}
// shortcut: storage is estimated from row counts, not measured on disk; switch to SQL byte sums if storage is ever billed exactly.
export const storageOf = (n: { codes: number; records: number; scans: number; folders: number; systems: number }) =>
  n.codes * 600 + n.records * 1024 + n.scans * 160 + n.folders * 128 + n.systems * 512;

/** True when adding `adding` to `used` would pass `limit` (null never passes). */
export const over = (limit: number | null, used: number, adding = 1) => limit !== null && used + adding > limit;

export function requireStorage(limits: Limits, usedBytes: number, addingBytes: number) {
  if (limits.storageMb !== null && usedBytes + addingBytes > limits.storageMb * 1048576)
    throw new ApiError(409, "Your storage is full. Ask for more storage or upgrade your plan.");
}
export function requireFeature(limits: Limits, feature: (typeof FEATURE_KEYS)[number], name: string) {
  if (!limits[feature]) throw new ApiError(403, `${name} is not included in your plan.`);
}

/** Base URL printed into this account's QR codes: its own domain only while that domain is verified and healthy. */
export function linkBase(root: Pick<Workspace, "customDomain" | "useCustomDomain" | "domainStatus">) {
  return root.customDomain && root.useCustomDomain && root.domainStatus === "verified" ? `https://${root.customDomain}` : process.env.APP_URL!;
}
