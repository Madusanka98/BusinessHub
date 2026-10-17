/*
  Warnings:

  - Added the required column `updatedAt` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Supplier` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_customerId_fkey`;

-- AlterTable
ALTER TABLE `customer` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notes` VARCHAR(500) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `financialtransaction` ADD COLUMN `purchaseId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `createdById` VARCHAR(191) NULL,
    ADD COLUMN `discountAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `isWalkIn` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `notes` VARCHAR(500) NULL,
    ADD COLUMN `postedAt` DATETIME(3) NULL,
    ADD COLUMN `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `walkInName` VARCHAR(100) NULL,
    MODIFY `customerId` VARCHAR(191) NULL,
    MODIFY `status` ENUM('DRAFT', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE `product` ADD COLUMN `barcode` VARCHAR(191) NULL,
    ADD COLUMN `description` VARCHAR(1000) NULL;

-- AlterTable
ALTER TABLE `stockmovement` ADD COLUMN `createdById` VARCHAR(191) NULL,
    MODIFY `type` ENUM('OPENING_STOCK', 'PURCHASE_RECEIPT', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_YIELD', 'SALE_DISPATCH', 'CUSTOMER_RETURN', 'SUPPLIER_RETURN', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SCRAP', 'ADJUSTMENT_AUDIT') NOT NULL;

-- AlterTable
ALTER TABLE `supplier` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notes` VARCHAR(500) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateTable
CREATE TABLE `Purchase` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `purchaseNumber` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'POSTED', 'CANCELLED', 'RETURNED') NOT NULL DEFAULT 'DRAFT',
    `paymentStatus` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID') NOT NULL DEFAULT 'UNPAID',
    `purchaseDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `discountAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `notes` VARCHAR(500) NULL,
    `postedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Purchase_businessId_purchaseDate_idx`(`businessId`, `purchaseDate`),
    INDEX `Purchase_supplierId_idx`(`supplierId`),
    UNIQUE INDEX `Purchase_businessId_purchaseNumber_key`(`businessId`, `purchaseNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseItem` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unitCost` DECIMAL(12, 2) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,

    INDEX `PurchaseItem_purchaseId_idx`(`purchaseId`),
    INDEX `PurchaseItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Customer_businessId_isActive_idx` ON `Customer`(`businessId`, `isActive`);

-- CreateIndex
CREATE INDEX `FinancialTransaction_purchaseId_idx` ON `FinancialTransaction`(`purchaseId`);

-- CreateIndex
CREATE INDEX `Product_businessId_barcode_idx` ON `Product`(`businessId`, `barcode`);

-- CreateIndex
CREATE INDEX `Supplier_businessId_isActive_idx` ON `Supplier`(`businessId`, `isActive`);

-- AddForeignKey
ALTER TABLE `FinancialTransaction` ADD CONSTRAINT `FinancialTransaction_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RedefineIndex
-- CREATE INDEX `FinancialTransaction_orderId_idx` ON `FinancialTransaction`(`orderId`);
