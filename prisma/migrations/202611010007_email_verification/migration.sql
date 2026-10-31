ALTER TABLE `users` ADD COLUMN `emailVerificationTokenHash` VARCHAR(191) NULL;
ALTER TABLE `users` ADD COLUMN `emailVerificationExpiresAt` DATETIME(3) NULL;
CREATE UNIQUE INDEX `users_emailVerificationTokenHash_key` ON `users`(`emailVerificationTokenHash`);
