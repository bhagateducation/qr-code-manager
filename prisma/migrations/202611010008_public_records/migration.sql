ALTER TABLE `records` ADD COLUMN `publicToken` VARCHAR(191) NULL;
ALTER TABLE `records` ADD COLUMN `isPublic` BOOLEAN NOT NULL DEFAULT false;
UPDATE `records` SET `publicToken` = UUID() WHERE `publicToken` IS NULL;
ALTER TABLE `records` MODIFY `publicToken` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `records_publicToken_key` ON `records`(`publicToken`);
