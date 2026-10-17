-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `isSuperAdmin` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    INDEX `Account_userId_idx`(`userId`),
    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Business` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING_SETUP', 'ACTIVE', 'SUSPENDED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `maxOwners` INTEGER NOT NULL DEFAULT 10,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Business_slug_key`(`slug`),
    INDEX `Business_slug_idx`(`slug`),
    INDEX `Business_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessMembership` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'PARTNER_FINANCE', 'PARTNER_OPERATIONS', 'STAFF', 'VIEWER') NOT NULL DEFAULT 'STAFF',
    `status` ENUM('ACTIVE', 'INACTIVE', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `equityPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `profitSharePercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BusinessMembership_businessId_role_idx`(`businessId`, `role`),
    INDEX `BusinessMembership_userId_idx`(`userId`),
    UNIQUE INDEX `BusinessMembership_businessId_userId_key`(`businessId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessSettings` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'LKR',
    `expenseApprovalThreshold` DECIMAL(12, 2) NOT NULL DEFAULT 500.00,
    `defaultReservePercentage` DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    `autoDeductInventory` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BusinessSettings_businessId_key`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvitationToken` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'PARTNER_FINANCE', 'PARTNER_OPERATIONS', 'STAFF', 'VIEWER') NOT NULL DEFAULT 'STAFF',
    `proposedEquity` DECIMAL(5, 2) NULL,
    `proposedProfitShare` DECIMAL(5, 2) NULL,
    `status` ENUM('PENDING', 'CONSUMED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InvitationToken_tokenHash_key`(`tokenHash`),
    INDEX `InvitationToken_businessId_status_idx`(`businessId`, `status`),
    INDEX `InvitationToken_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransactionCategory` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TransactionCategory_businessId_idx`(`businessId`),
    UNIQUE INDEX `TransactionCategory_businessId_name_type_key`(`businessId`, `name`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinancialTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paymentMethod` ENUM('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'MOBILE_PAYMENT', 'CHEQUE') NOT NULL DEFAULT 'CASH',
    `description` VARCHAR(500) NOT NULL,
    `receiptUrl` VARCHAR(1000) NULL,
    `approvalStatus` ENUM('ACTIVE', 'PENDING_APPROVAL', 'REJECTED') NOT NULL DEFAULT 'ACTIVE',
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `closedPeriodId` VARCHAR(191) NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `approvedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FinancialTransaction_businessId_transactionDate_idx`(`businessId`, `transactionDate`),
    INDEX `FinancialTransaction_businessId_approvalStatus_idx`(`businessId`, `approvalStatus`),
    INDEX `FinancialTransaction_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerCapitalContribution` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `membershipId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paymentReference` VARCHAR(191) NULL,
    `notes` VARCHAR(500) NULL,
    `contributionDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PartnerCapitalContribution_businessId_contributionDate_idx`(`businessId`, `contributionDate`),
    INDEX `PartnerCapitalContribution_membershipId_idx`(`membershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerLoan` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `membershipId` VARCHAR(191) NOT NULL,
    `principalAmount` DECIMAL(12, 2) NOT NULL,
    `annualInterestRate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `outstandingBalance` DECIMAL(12, 2) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `maturityDate` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'REPAID', 'DEFAULTED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PartnerLoan_businessId_status_idx`(`businessId`, `status`),
    INDEX `PartnerLoan_membershipId_idx`(`membershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerDrawing` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `membershipId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('ACTIVE', 'PENDING_APPROVAL', 'REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL',
    `approvedById` VARCHAR(191) NULL,
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,

    INDEX `PartnerDrawing_businessId_requestDate_idx`(`businessId`, `requestDate`),
    INDEX `PartnerDrawing_membershipId_idx`(`membershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClosedPeriod` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `periodName` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `totalIncome` DECIMAL(12, 2) NOT NULL,
    `totalExpense` DECIMAL(12, 2) NOT NULL,
    `netProfit` DECIMAL(12, 2) NOT NULL,
    `retainedReserve` DECIMAL(12, 2) NOT NULL,
    `distributedAmount` DECIMAL(12, 2) NOT NULL,
    `closedById` VARCHAR(191) NOT NULL,
    `closedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ClosedPeriod_businessId_idx`(`businessId`),
    UNIQUE INDEX `ClosedPeriod_businessId_startDate_endDate_key`(`businessId`, `startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfitDistribution` (
    `id` VARCHAR(191) NOT NULL,
    `closedPeriodId` VARCHAR(191) NOT NULL,
    `membershipId` VARCHAR(191) NOT NULL,
    `profitSharePercentage` DECIMAL(5, 2) NOT NULL,
    `allocatedAmount` DECIMAL(12, 2) NOT NULL,
    `distributedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProfitDistribution_closedPeriodId_idx`(`closedPeriodId`),
    INDEX `ProfitDistribution_membershipId_idx`(`membershipId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` ENUM('RAW_MATERIAL', 'PACKAGING', 'FRESH_MUSHROOM', 'DRIED_MUSHROOM', 'GENERAL_PRODUCT') NOT NULL,
    `unitOfMeasure` ENUM('KG', 'GRAM', 'BAG', 'PIECE', 'LITER', 'PACK') NOT NULL DEFAULT 'PIECE',
    `currentStock` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `unitCost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `sellingPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `reorderThreshold` DECIMAL(12, 3) NOT NULL DEFAULT 10.000,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_businessId_category_idx`(`businessId`, `category`),
    UNIQUE INDEX `Product_businessId_sku_key`(`businessId`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `type` ENUM('PURCHASE_RECEIPT', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_YIELD', 'SALE_DISPATCH', 'ADJUSTMENT_SCRAP', 'ADJUSTMENT_AUDIT') NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `balanceAfter` DECIMAL(12, 3) NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `notes` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockMovement_businessId_createdAt_idx`(`businessId`, `createdAt`),
    INDEX `StockMovement_productId_createdAt_idx`(`productId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Customer_businessId_name_idx`(`businessId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Supplier_businessId_name_idx`(`businessId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('DRAFT', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    `paymentStatus` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID') NOT NULL DEFAULT 'UNPAID',
    `orderDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Order_businessId_orderDate_idx`(`businessId`, `orderDate`),
    INDEX `Order_customerId_idx`(`customerId`),
    UNIQUE INDEX `Order_businessId_orderNumber_key`(`businessId`, `orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,

    INDEX `OrderItem_orderId_idx`(`orderId`),
    INDEX `OrderItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MushroomStrain` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `scientificName` VARCHAR(191) NULL,
    `optimalTempRange` VARCHAR(191) NULL,
    `optimalHumidity` VARCHAR(191) NULL,
    `incubationDays` INTEGER NOT NULL DEFAULT 21,
    `fruitingDays` INTEGER NOT NULL DEFAULT 7,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MushroomStrain_businessId_idx`(`businessId`),
    UNIQUE INDEX `MushroomStrain_businessId_name_key`(`businessId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubstrateRecipe` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `strainId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `standardBagWeightKg` DECIMAL(6, 3) NOT NULL,
    `instructions` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SubstrateRecipe_businessId_idx`(`businessId`),
    INDEX `SubstrateRecipe_strainId_idx`(`strainId`),
    UNIQUE INDEX `SubstrateRecipe_businessId_name_key`(`businessId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecipeIngredient` (
    `id` VARCHAR(191) NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,
    `rawMaterialProductId` VARCHAR(191) NOT NULL,
    `percentage` DECIMAL(5, 2) NOT NULL,
    `quantityPerBag` DECIMAL(8, 4) NOT NULL,

    INDEX `RecipeIngredient_recipeId_idx`(`recipeId`),
    UNIQUE INDEX `RecipeIngredient_recipeId_rawMaterialProductId_key`(`recipeId`, `rawMaterialProductId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FruitingChamber` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `capacityBags` INTEGER NOT NULL DEFAULT 1000,
    `status` ENUM('ACTIVE', 'CLEANING', 'MAINTENANCE', 'EMPTY') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FruitingChamber_businessId_idx`(`businessId`),
    UNIQUE INDEX `FruitingChamber_businessId_name_key`(`businessId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductionBatch` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `batchCode` VARCHAR(191) NOT NULL,
    `strainId` VARCHAR(191) NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,
    `chamberId` VARCHAR(191) NULL,
    `initialBagsCount` INTEGER NOT NULL,
    `viableBagsCount` INTEGER NOT NULL,
    `currentPhase` ENUM('PREPARATION', 'STERILIZATION', 'INOCULATION', 'INCUBATION', 'FRUITING', 'COMPLETED', 'TERMINATED') NOT NULL DEFAULT 'PREPARATION',
    `status` ENUM('ACTIVE', 'COMPLETED', 'TERMINATED_CONTAMINATED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedDate` DATETIME(3) NULL,
    `initiatedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductionBatch_businessId_currentPhase_idx`(`businessId`, `currentPhase`),
    INDEX `ProductionBatch_businessId_status_idx`(`businessId`, `status`),
    INDEX `ProductionBatch_strainId_idx`(`strainId`),
    UNIQUE INDEX `ProductionBatch_businessId_batchCode_key`(`businessId`, `batchCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PhaseLog` (
    `id` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `phase` ENUM('PREPARATION', 'STERILIZATION', 'INOCULATION', 'INCUBATION', 'FRUITING', 'COMPLETED', 'TERMINATED') NOT NULL,
    `temperature` DECIMAL(5, 2) NULL,
    `humidity` DECIMAL(5, 2) NULL,
    `co2Ppm` INTEGER NULL,
    `notes` VARCHAR(500) NULL,
    `loggedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PhaseLog_batchId_loggedAt_idx`(`batchId`, `loggedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HarvestLog` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `freshProductId` VARCHAR(191) NOT NULL,
    `flushNumber` INTEGER NOT NULL DEFAULT 1,
    `totalFreshWeightKg` DECIMAL(10, 3) NOT NULL,
    `gradeAWeightKg` DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    `gradeBWeightKg` DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    `scrapWeightKg` DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
    `harvestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `harvestedById` VARCHAR(191) NOT NULL,

    INDEX `HarvestLog_businessId_harvestDate_idx`(`businessId`, `harvestDate`),
    INDEX `HarvestLog_batchId_flushNumber_idx`(`batchId`, `flushNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContaminationLog` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `phaseDetected` ENUM('PREPARATION', 'STERILIZATION', 'INOCULATION', 'INCUBATION', 'FRUITING', 'COMPLETED', 'TERMINATED') NOT NULL,
    `discardedBagsCount` INTEGER NOT NULL,
    `reason` ENUM('GREEN_MOLD_TRICHODERMA', 'COBWEB_DACTYLIUM', 'BACTERIAL_BLOTCH', 'BLACK_PIN_MOLD', 'RODENT_PEST', 'STERILIZATION_FAILURE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `notes` VARCHAR(500) NULL,
    `loggedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContaminationLog_businessId_loggedAt_idx`(`businessId`, `loggedAt`),
    INDEX `ContaminationLog_batchId_idx`(`batchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DryingRun` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `freshProductId` VARCHAR(191) NOT NULL,
    `driedProductId` VARCHAR(191) NOT NULL,
    `freshWeightInKg` DECIMAL(10, 3) NOT NULL,
    `driedWeightOutKg` DECIMAL(10, 3) NOT NULL,
    `moistureLossPercentage` DECIMAL(5, 2) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DryingRun_businessId_startedAt_idx`(`businessId`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `actionType` VARCHAR(191) NOT NULL,
    `targetEntity` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `clientIp` VARCHAR(191) NULL,
    `changeDetails` JSON NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditEvent_businessId_timestamp_idx`(`businessId`, `timestamp`),
    INDEX `AuditEvent_userId_timestamp_idx`(`userId`, `timestamp`),
    INDEX `AuditEvent_actionType_idx`(`actionType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessMembership` ADD CONSTRAINT `BusinessMembership_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessMembership` ADD CONSTRAINT `BusinessMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessSettings` ADD CONSTRAINT `BusinessSettings_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvitationToken` ADD CONSTRAINT `InvitationToken_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionCategory` ADD CONSTRAINT `TransactionCategory_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialTransaction` ADD CONSTRAINT `FinancialTransaction_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialTransaction` ADD CONSTRAINT `FinancialTransaction_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `TransactionCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialTransaction` ADD CONSTRAINT `FinancialTransaction_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialTransaction` ADD CONSTRAINT `FinancialTransaction_closedPeriodId_fkey` FOREIGN KEY (`closedPeriodId`) REFERENCES `ClosedPeriod`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialTransaction` ADD CONSTRAINT `FinancialTransaction_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancialTransaction` ADD CONSTRAINT `FinancialTransaction_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerCapitalContribution` ADD CONSTRAINT `PartnerCapitalContribution_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerCapitalContribution` ADD CONSTRAINT `PartnerCapitalContribution_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `BusinessMembership`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerLoan` ADD CONSTRAINT `PartnerLoan_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerLoan` ADD CONSTRAINT `PartnerLoan_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `BusinessMembership`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerDrawing` ADD CONSTRAINT `PartnerDrawing_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerDrawing` ADD CONSTRAINT `PartnerDrawing_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `BusinessMembership`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClosedPeriod` ADD CONSTRAINT `ClosedPeriod_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfitDistribution` ADD CONSTRAINT `ProfitDistribution_closedPeriodId_fkey` FOREIGN KEY (`closedPeriodId`) REFERENCES `ClosedPeriod`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfitDistribution` ADD CONSTRAINT `ProfitDistribution_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `BusinessMembership`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MushroomStrain` ADD CONSTRAINT `MushroomStrain_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubstrateRecipe` ADD CONSTRAINT `SubstrateRecipe_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubstrateRecipe` ADD CONSTRAINT `SubstrateRecipe_strainId_fkey` FOREIGN KEY (`strainId`) REFERENCES `MushroomStrain`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeIngredient` ADD CONSTRAINT `RecipeIngredient_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `SubstrateRecipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeIngredient` ADD CONSTRAINT `RecipeIngredient_rawMaterialProductId_fkey` FOREIGN KEY (`rawMaterialProductId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FruitingChamber` ADD CONSTRAINT `FruitingChamber_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionBatch` ADD CONSTRAINT `ProductionBatch_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionBatch` ADD CONSTRAINT `ProductionBatch_strainId_fkey` FOREIGN KEY (`strainId`) REFERENCES `MushroomStrain`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionBatch` ADD CONSTRAINT `ProductionBatch_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `SubstrateRecipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionBatch` ADD CONSTRAINT `ProductionBatch_chamberId_fkey` FOREIGN KEY (`chamberId`) REFERENCES `FruitingChamber`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionBatch` ADD CONSTRAINT `ProductionBatch_initiatedById_fkey` FOREIGN KEY (`initiatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhaseLog` ADD CONSTRAINT `PhaseLog_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `ProductionBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HarvestLog` ADD CONSTRAINT `HarvestLog_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HarvestLog` ADD CONSTRAINT `HarvestLog_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `ProductionBatch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HarvestLog` ADD CONSTRAINT `HarvestLog_freshProductId_fkey` FOREIGN KEY (`freshProductId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HarvestLog` ADD CONSTRAINT `HarvestLog_harvestedById_fkey` FOREIGN KEY (`harvestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContaminationLog` ADD CONSTRAINT `ContaminationLog_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContaminationLog` ADD CONSTRAINT `ContaminationLog_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `ProductionBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DryingRun` ADD CONSTRAINT `DryingRun_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DryingRun` ADD CONSTRAINT `DryingRun_freshProductId_fkey` FOREIGN KEY (`freshProductId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DryingRun` ADD CONSTRAINT `DryingRun_driedProductId_fkey` FOREIGN KEY (`driedProductId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
