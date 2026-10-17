-- AlterTable
ALTER TABLE `dryingrun` ADD COLUMN `batchId` VARCHAR(191) NULL,
    ADD COLUMN `conductedById` VARCHAR(191) NULL,
    ADD COLUMN `dryingYieldRatio` DECIMAL(5, 2) NULL,
    ADD COLUMN `lossReason` VARCHAR(255) NULL,
    ADD COLUMN `lossWeightKg` DECIMAL(10, 3) NULL DEFAULT 0.000,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `runCode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `harvestlog` ADD COLUMN `harvestCode` VARCHAR(191) NULL,
    ADD COLUMN `notes` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `phaselog` ADD COLUMN `loggedById` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `productionbatch` ADD COLUMN `allocatedCost` DECIMAL(12, 2) NULL DEFAULT 0.00,
    ADD COLUMN `expectedYieldKg` DECIMAL(10, 3) NULL DEFAULT 0.000,
    ADD COLUMN `notes` TEXT NULL;

-- CreateIndex
CREATE INDEX `DryingRun_batchId_idx` ON `DryingRun`(`batchId`);

-- AddForeignKey
ALTER TABLE `DryingRun` ADD CONSTRAINT `DryingRun_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `ProductionBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
