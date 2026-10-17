-- CreateTable
CREATE TABLE `ScheduledReport` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `reportType` ENUM('PROFIT_AND_LOSS', 'SALES_SUMMARY', 'PURCHASES_SUMMARY', 'INVENTORY_VALUATION', 'LOW_STOCK_ALERT', 'MUSHROOM_PRODUCTION', 'CASH_FLOW') NOT NULL,
    `frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'WEEKLY',
    `dayOfWeek` INTEGER NULL DEFAULT 1,
    `dayOfMonth` INTEGER NULL DEFAULT 1,
    `timeOfDay` VARCHAR(191) NOT NULL DEFAULT '08:00',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Colombo',
    `recipients` JSON NOT NULL,
    `format` ENUM('CSV', 'JSON') NOT NULL DEFAULT 'CSV',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastRunAt` DATETIME(3) NULL,
    `nextRunAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ScheduledReport_businessId_isActive_idx`(`businessId`, `isActive`),
    INDEX `ScheduledReport_nextRunAt_idx`(`nextRunAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduledReportRun` (
    `id` VARCHAR(191) NOT NULL,
    `scheduledReportId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `executionDurationMs` INTEGER NULL,
    `recipientsCount` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,

    INDEX `ScheduledReportRun_scheduledReportId_startedAt_idx`(`scheduledReportId`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationPreference` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `emailNotifications` BOOLEAN NOT NULL DEFAULT true,
    `lowStockAlerts` BOOLEAN NOT NULL DEFAULT true,
    `productionPhaseAlerts` BOOLEAN NOT NULL DEFAULT true,
    `weeklySummary` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `NotificationPreference_businessId_idx`(`businessId`),
    UNIQUE INDEX `NotificationPreference_businessId_userId_key`(`businessId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformSettings` (
    `id` VARCHAR(191) NOT NULL,
    `platformName` VARCHAR(191) NOT NULL DEFAULT 'BusinessHub SaaS',
    `supportEmail` VARCHAR(191) NOT NULL DEFAULT 'support@businesshub.local',
    `defaultTimezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Colombo',
    `defaultCurrency` VARCHAR(191) NOT NULL DEFAULT 'LKR',
    `enableRegistration` BOOLEAN NOT NULL DEFAULT false,
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ScheduledReport` ADD CONSTRAINT `ScheduledReport_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduledReportRun` ADD CONSTRAINT `ScheduledReportRun_scheduledReportId_fkey` FOREIGN KEY (`scheduledReportId`) REFERENCES `ScheduledReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
