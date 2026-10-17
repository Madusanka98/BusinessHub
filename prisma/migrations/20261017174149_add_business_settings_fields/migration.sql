-- AlterTable
ALTER TABLE `businesssettings` ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `businessType` VARCHAR(191) NULL,
    ADD COLUMN `contactEmail` VARCHAR(191) NULL,
    ADD COLUMN `contactPhone` VARCHAR(191) NULL,
    ADD COLUMN `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Colombo';
