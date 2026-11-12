-- AlterTable
ALTER TABLE `workspaces` ADD COLUMN `customDomain` VARCHAR(191) NULL,
    ADD COLUMN `customLimits` JSON NULL,
    ADD COLUMN `domainCheckedAt` DATETIME(3) NULL,
    ADD COLUMN `domainStatus` VARCHAR(191) NOT NULL DEFAULT 'none',
    ADD COLUMN `domainToken` VARCHAR(191) NULL,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `parentId` VARCHAR(191) NULL,
    ADD COLUMN `remindedAt` DATETIME(3) NULL,
    ADD COLUMN `useCustomDomain` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Session` ADD COLUMN `workspaceId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `method` VARCHAR(191) NOT NULL DEFAULT 'razorpay',
    ADD COLUMN `note` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `plans` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `pricePaise` INTEGER NOT NULL DEFAULT 0,
    `days` INTEGER NOT NULL DEFAULT 30,
    `codes` INTEGER NULL,
    `systems` INTEGER NULL,
    `records` INTEGER NULL,
    `storageMb` INTEGER NULL,
    `panels` INTEGER NULL,
    `members` INTEGER NULL,
    `allowApi` BOOLEAN NOT NULL DEFAULT true,
    `allowBooks` BOOLEAN NOT NULL DEFAULT true,
    `allowDomain` BOOLEAN NOT NULL DEFAULT false,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_settings` (
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `workspaces_customDomain_key` ON `workspaces`(`customDomain`);

-- CreateIndex
CREATE INDEX `workspaces_parentId_idx` ON `workspaces`(`parentId`);

-- AddForeignKey
ALTER TABLE `workspaces` ADD CONSTRAINT `workspaces_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Starting plans. Same limits as before, plus 1 GB storage each; the owner edits them in the panel.
INSERT INTO `plans` (`id`, `name`, `description`, `pricePaise`, `days`, `codes`, `systems`, `records`, `storageMb`, `panels`, `members`, `allowApi`, `allowBooks`, `allowDomain`, `isPublic`, `sort`, `createdAt`, `updatedAt`) VALUES
('free', 'Free', 'For your first codes', 0, 30, 10, 1, 50, 1024, 0, 3, true, true, false, true, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('pro', 'Pro', 'For growing teams and campaigns', 49900, 30, 500, 10, 5000, 1024, 3, 10, true, true, true, true, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('business', 'Business', 'For large collections and operations', 149900, 30, 2500, 50, 25000, 1024, 10, 50, true, true, true, true, 2, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- The platform owner's workspace moves from the stand-in Business plan to the unlimited owner plan.
UPDATE `workspaces` SET `plan` = 'owner' WHERE `id` IN (SELECT `workspaceId` FROM (SELECT `workspaceId` FROM `users` WHERE `platformAdmin` = true) AS admins);
