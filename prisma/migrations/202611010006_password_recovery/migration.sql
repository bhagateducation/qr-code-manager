ALTER TABLE `users` ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL;
ALTER TABLE `users` ADD COLUMN `passwordResetTokenHash` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN `passwordResetExpiresAt` DATETIME(3) NULL;
CREATE UNIQUE INDEX `users_passwordResetTokenHash_key` ON `users`(`passwordResetTokenHash`);
