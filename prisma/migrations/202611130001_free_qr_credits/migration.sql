-- One free QR code per website visitor, without an account.
CREATE TABLE `free_qr_credits` (
    `id` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `content` TEXT NULL,
    `ipHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `free_qr_credits_visitorId_key`(`visitorId`),
    INDEX `free_qr_credits_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Free accounts: one QR code and no API, Book QR or custom domain. The owner can still change this under Plans.
UPDATE `plans` SET `codes` = 1, `allowApi` = false, `allowBooks` = false, `allowDomain` = false WHERE `id` = 'free';
