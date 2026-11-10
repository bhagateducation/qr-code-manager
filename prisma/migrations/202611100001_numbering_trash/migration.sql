-- QR numbering (per workspace) and trash (soft delete).
ALTER TABLE `workspaces` ADD COLUMN `qrSeq` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `qr_codes` ADD COLUMN `number` INTEGER NOT NULL DEFAULT 0, ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- Number existing codes in creation order, then record the highest number per workspace.
UPDATE `qr_codes` q
JOIN (SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `workspaceId` ORDER BY `createdAt`, `id`) AS n FROM `qr_codes`) r ON r.`id` = q.`id`
SET q.`number` = r.n;
UPDATE `workspaces` w SET w.`qrSeq` = (SELECT COALESCE(MAX(q.`number`), 0) FROM `qr_codes` q WHERE q.`workspaceId` = w.`id`);

CREATE UNIQUE INDEX `qr_codes_workspaceId_number_key` ON `qr_codes`(`workspaceId`, `number`);
CREATE INDEX `qr_codes_workspaceId_deletedAt_createdAt_idx` ON `qr_codes`(`workspaceId`, `deletedAt`, `createdAt`);
