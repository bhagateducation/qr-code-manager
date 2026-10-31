ALTER TABLE `qr_codes` ADD COLUMN `campaignId` VARCHAR(191) NULL;
CREATE INDEX `qr_codes_campaignId_idx` ON `qr_codes`(`campaignId`);
ALTER TABLE `qr_codes` ADD CONSTRAINT `qr_codes_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `qr_code_tags` (
  `qrCodeId` VARCHAR(191) NOT NULL,
  `tagId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`qrCodeId`, `tagId`),
  INDEX `qr_code_tags_tagId_idx` (`tagId`),
  CONSTRAINT `qr_code_tags_qrCodeId_fkey` FOREIGN KEY (`qrCodeId`) REFERENCES `qr_codes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `qr_code_tags_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `tags` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
