-- Manual order for folders and codes. Existing codes keep their number order.
ALTER TABLE `folders` ADD COLUMN `position` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `qr_codes` ADD COLUMN `position` INTEGER NOT NULL DEFAULT 0;
UPDATE `qr_codes` SET `position` = `number`;
-- Email sign-in codes.
ALTER TABLE `users` ADD COLUMN `loginCodeHash` VARCHAR(191) NULL, ADD COLUMN `loginCodeExpires` DATETIME(3) NULL, ADD COLUMN `loginCodeTries` INTEGER NOT NULL DEFAULT 0;
-- Panel notifications.
ALTER TABLE `users` ADD COLUMN `notificationsSeenAt` DATETIME(3) NULL;
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `link` VARCHAR(191) NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'update',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `notifications_workspaceId_createdAt_idx`(`workspaceId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
