CREATE TABLE `webhook_deliveries` (
  `id` VARCHAR(191) NOT NULL,
  `webhookId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `responseCode` INTEGER NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `lastError` VARCHAR(191) NULL,
  `deliveredAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `webhook_deliveries_webhookId_createdAt_idx` (`webhookId`, `createdAt`),
  INDEX `webhook_deliveries_status_createdAt_idx` (`status`, `createdAt`),
  CONSTRAINT `webhook_deliveries_webhookId_fkey` FOREIGN KEY (`webhookId`) REFERENCES `webhooks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
