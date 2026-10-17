-- AlterTable
ALTER TABLE `closedperiod` ADD COLUMN `notes` VARCHAR(500) NULL,
    ADD COLUMN `ruleSnapshot` JSON NULL;

-- AlterTable
ALTER TABLE `partnerloan` ADD COLUMN `description` VARCHAR(500) NULL,
    ADD COLUMN `loanDirection` ENUM('PARTNER_TO_BUSINESS', 'BUSINESS_TO_PARTNER') NOT NULL DEFAULT 'PARTNER_TO_BUSINESS';

-- CreateTable
CREATE TABLE `LoanRepayment` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `principalAmount` DECIMAL(12, 2) NOT NULL,
    `interestAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `paymentDate` DATETIME(3) NOT NULL,
    `notes` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoanRepayment_loanId_paymentDate_idx`(`loanId`, `paymentDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfitSharingRule` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ruleType` ENUM('EQUAL', 'OWNERSHIP_PERCENTAGE', 'CAPITAL_BASED', 'CONTRIBUTION_POINTS', 'CUSTOM_PERCENTAGE', 'HYBRID_WEIGHTED') NOT NULL DEFAULT 'CUSTOM_PERCENTAGE',
    `lossPolicy` ENUM('CARRY_FORWARD', 'ABSORB_FROM_RESERVE', 'ALLOCATE_ACCORDING_TO_RULE', 'HOLD_IN_SUSPENSE') NOT NULL DEFAULT 'CARRY_FORWARD',
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `description` VARCHAR(500) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `allocationsJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProfitSharingRule_businessId_isActive_idx`(`businessId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LoanRepayment` ADD CONSTRAINT `LoanRepayment_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `PartnerLoan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfitSharingRule` ADD CONSTRAINT `ProfitSharingRule_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
