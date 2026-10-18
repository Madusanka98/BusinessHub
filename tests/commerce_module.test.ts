import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createProduct,
  updateProduct,
  archiveProduct,
  getProducts,
  getProductById,
} from "@/modules/commerce/services/product.service";
import {
  recordStockMovement,
  adjustStock,
  getStockMovements,
  getInventorySummary,
  InsufficientStockError,
} from "@/modules/commerce/services/stock.service";
import {
  createCustomer,
  updateCustomer,
  createSupplier,
  updateSupplier,
} from "@/modules/commerce/services/contact.service";
import {
  createPurchaseDraft,
  postPurchase,
  cancelPurchaseDraft,
  recordSupplierReturn,
  getPurchases,
} from "@/modules/commerce/services/purchase.service";
import {
  createOrderDraft,
  postOrder,
  cancelOrderDraft,
  recordCustomerReturn,
  getOrders,
} from "@/modules/commerce/services/sale.service";
import { createBusinessBySuperAdmin } from "@/modules/core-tenancy/services/business.service";
import { hashPassword } from "@/lib/auth/password";
import {
  ProductCategory,
  UnitOfMeasure,
  StockMovementType,
  PurchaseStatus,
  OrderStatus,
  TransactionType,
  PaymentMethod,
} from "@prisma/client";

describe("Task 6: Commerce, Inventory, Purchasing & Sales Module", () => {
  const timestamp = Date.now();
  let superAdminId: string;
  let ownerUserId: string;
  let businessAId: string;
  let businessBId: string;

  beforeAll(async () => {
    const pwd = await hashPassword("ValidPass@123!");

    // Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        email: `admin-commerce-${timestamp}@test.local`,
        fullName: "Platform Admin Commerce",
        passwordHash: pwd,
        isSuperAdmin: true,
        isActive: true,
      },
    });
    superAdminId = superAdmin.id;

    // Owner User
    const owner = await prisma.user.create({
      data: {
        email: `owner-commerce-${timestamp}@test.local`,
        fullName: "Business Owner Commerce",
        passwordHash: pwd,
        isSuperAdmin: false,
        isActive: true,
      },
    });
    ownerUserId = owner.id;

    // Business A
    const busA = await createBusinessBySuperAdmin(
      {
        name: `AgriFarm Alpha ${timestamp}`,
        initialOwnerEmail: owner.email,
        timezone: "Asia/Colombo",
        currency: "LKR",
      },
      superAdminId
    );
    businessAId = busA.businessId;

    // Business B (for cross-tenant tests)
    const busB = await createBusinessBySuperAdmin(
      {
        name: `AgriFarm Beta ${timestamp}`,
        initialOwnerEmail: owner.email,
        timezone: "Asia/Colombo",
        currency: "LKR",
      },
      superAdminId
    );
    businessBId = busB.businessId;
  });

  afterAll(async () => {
    if (!businessAId || !businessBId) return;
    // Clean up
    await prisma.financialTransaction.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.stockMovement.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.purchaseItem.deleteMany({
      where: { purchase: { businessId: { in: [businessAId, businessBId] } } },
    });
    await prisma.purchase.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { businessId: { in: [businessAId, businessBId] } } },
    });
    await prisma.order.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.product.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.customer.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.supplier.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.businessMembership.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.businessSettings.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: [businessAId, businessBId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [superAdminId, ownerUserId] } },
    });
  });

  // ==========================================
  // 1. PRODUCT MANAGEMENT
  // ==========================================
  describe("Product Management & Business-Scoped Uniqueness", () => {
    it("creates a product and records opening stock movement atomically", async () => {
      const product = await createProduct(
        businessAId,
        {
          name: "Fresh Oyster Mushrooms",
          sku: "OYSTER-500G",
          category: ProductCategory.FRESH_MUSHROOM,
          unitOfMeasure: UnitOfMeasure.PACK,
          unitCost: 150.0,
          sellingPrice: 300.0,
          reorderThreshold: 20,
          initialStock: 50,
          description: "Premium oyster mushrooms in 500g packs",
          barcode: `BAR-${timestamp}-1`,
        },
        ownerUserId
      );

      expect(product.id).toBeDefined();
      expect(product.sku).toBe("OYSTER-500G");
      expect(Number(product.currentStock)).toBe(50);
      expect(Number(product.unitCost)).toBe(150.0);
      expect(Number(product.sellingPrice)).toBe(300.0);

      // Verify opening stock movement was created
      const movements = await prisma.stockMovement.findMany({
        where: { productId: product.id },
      });
      expect(movements.length).toBe(1);
      expect(movements[0].type).toBe(StockMovementType.OPENING_STOCK);
      expect(Number(movements[0].quantity)).toBe(50);
      expect(Number(movements[0].balanceAfter)).toBe(50);
    });

    it("rejects duplicate SKU within the same business", async () => {
      await expect(
        createProduct(
          businessAId,
          {
            name: "Duplicate SKU Product",
            sku: "OYSTER-500G", // same as above
            category: ProductCategory.FRESH_MUSHROOM,
            unitOfMeasure: UnitOfMeasure.PACK,
            unitCost: 100,
            sellingPrice: 200,
            reorderThreshold: 5,
          },
          ownerUserId
        )
      ).rejects.toThrow(/already exists/i);
    });

    it("allows the same SKU in a different business tenant (tenant isolation)", async () => {
      const productInB = await createProduct(
        businessBId,
        {
          name: "Different Business Oyster",
          sku: "OYSTER-500G", // same SKU, different business
          category: ProductCategory.FRESH_MUSHROOM,
          unitOfMeasure: UnitOfMeasure.PACK,
          unitCost: 160.0,
          sellingPrice: 320.0,
          reorderThreshold: 10,
        },
        ownerUserId
      );

      expect(productInB.businessId).toBe(businessBId);
      expect(productInB.sku).toBe("OYSTER-500G");
    });

    it("updates product non-stock fields while preserving stock quantity", async () => {
      const product = await prisma.product.findFirstOrThrow({
        where: { businessId: businessAId, sku: "OYSTER-500G" },
      });

      const updated = await updateProduct(
        businessAId,
        {
          id: product.id,
          name: "Fresh Oyster Mushrooms (Updated)",
          category: ProductCategory.FRESH_MUSHROOM,
          unitOfMeasure: UnitOfMeasure.PACK,
          unitCost: 155.0,
          sellingPrice: 350.0,
          reorderThreshold: 25,
          isActive: true,
        },
        ownerUserId
      );

      expect(updated.name).toBe("Fresh Oyster Mushrooms (Updated)");
      expect(Number(updated.sellingPrice)).toBe(350.0);
      // Stock quantity must remain unaffected by metadata updates
      expect(Number(updated.currentStock)).toBe(50);
    });
  });

  // ==========================================
  // 2. ATOMIC STOCK MOVEMENTS & ADJUSTMENTS
  // ==========================================
  describe("Atomic Stock Movements & Negative Stock Prevention", () => {
    let substrateProduct: any;

    beforeAll(async () => {
      substrateProduct = await createProduct(
        businessAId,
        {
          name: "Rubber Wood Sawdust",
          sku: "SAWDUST-KG",
          category: ProductCategory.RAW_MATERIAL,
          unitOfMeasure: UnitOfMeasure.KG,
          unitCost: 20.0,
          sellingPrice: 40.0,
          reorderThreshold: 100,
          initialStock: 200,
        },
        ownerUserId
      );
    });

    it("executes an authorized positive stock adjustment (ADJUSTMENT_ADD)", async () => {
      const result = await adjustStock(
        businessAId,
        {
          productId: substrateProduct.id,
          type: StockMovementType.ADJUSTMENT_ADD,
          quantity: 50,
          notes: "Donated raw sawdust bags received",
        },
        ownerUserId
      );

      expect(result.newBalance).toBe(250);
      const updated = await prisma.product.findUniqueOrThrow({
        where: { id: substrateProduct.id },
      });
      expect(Number(updated.currentStock)).toBe(250);
    });

    it("executes an authorized negative stock adjustment (ADJUSTMENT_SCRAP)", async () => {
      const result = await adjustStock(
        businessAId,
        {
          productId: substrateProduct.id,
          type: StockMovementType.ADJUSTMENT_SCRAP,
          quantity: 20,
          notes: "Water-damaged wet sawdust bags discarded",
        },
        ownerUserId
      );

      expect(result.newBalance).toBe(230);
    });

    it("strictly prevents negative stock balances atomically", async () => {
      // Current stock is 230; attempting to deduct 300 must fail
      await expect(
        recordStockMovement({
          businessId: businessAId,
          productId: substrateProduct.id,
          type: StockMovementType.SALE_DISPATCH,
          quantity: -300,
          notes: "Excessive dispatch",
        })
      ).rejects.toThrow(InsufficientStockError);

      // Verify stock was NOT modified
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: substrateProduct.id },
      });
      expect(Number(product.currentStock)).toBe(230);
    });
  });

  // ==========================================
  // 3. CONTACTS (SUPPLIERS & CUSTOMERS)
  // ==========================================
  describe("Supplier & Customer Management", () => {
    let supplierId: string;
    let customerId: string;

    it("creates and updates a supplier", async () => {
      const supplier = await createSupplier(
        businessAId,
        {
          name: "Lanka Agro Supplies",
          contactPerson: "Mr. Silva",
          email: "silva@agro.local",
          phone: "0771234567",
          address: "123 Farm Rd, Kurunegala",
          notes: "Primary spawn supplier",
          isActive: true,
        },
        ownerUserId
      );

      supplierId = supplier.id;
      expect(supplier.id).toBeDefined();
      expect(supplier.name).toBe("Lanka Agro Supplies");

      const updated = await updateSupplier(
        businessAId,
        supplierId,
        {
          name: "Lanka Agro Supplies Ltd",
          contactPerson: "Mr. K. Silva",
          isActive: true,
        },
        ownerUserId
      );
      expect(updated.name).toBe("Lanka Agro Supplies Ltd");
    });

    it("creates and updates a customer", async () => {
      const customer = await createCustomer(
        businessAId,
        {
          name: "Super Fresh Grocers",
          email: "procurement@superfresh.local",
          phone: "0112345678",
          address: "Colombo 03",
          notes: "Supermarket chain",
          isActive: true,
        },
        ownerUserId
      );

      customerId = customer.id;
      expect(customer.id).toBeDefined();
      expect(customer.name).toBe("Super Fresh Grocers");

      const updated = await updateCustomer(
        businessAId,
        customerId,
        {
          name: "Super Fresh Mart",
          isActive: true,
        },
        ownerUserId
      );
      expect(updated.name).toBe("Super Fresh Mart");
    });
  });

  // ==========================================
  // 4. PURCHASING WORKFLOW & FINANCE INTEGRATION
  // ==========================================
  describe("Purchasing Workflow with Task 5 Finance Integration", () => {
    let supplier: any;
    let packagingProduct: any;
    let purchaseDraft: any;

    beforeAll(async () => {
      supplier = await createSupplier(
        businessAId,
        { name: "PackCo Supplies" },
        ownerUserId
      );

      packagingProduct = await createProduct(
        businessAId,
        {
          name: "Polypropylene Growing Bags",
          sku: "PP-BAG-01",
          category: ProductCategory.PACKAGING,
          unitOfMeasure: UnitOfMeasure.BAG,
          unitCost: 10.0,
          sellingPrice: 15.0,
          reorderThreshold: 50,
          initialStock: 100,
        },
        ownerUserId
      );
    });

    it("creates a purchase draft with correct server-calculated totals without altering stock", async () => {
      // 50 bags at 12.00 each = 600.00, discount 50, tax 20 = 570.00
      purchaseDraft = await createPurchaseDraft(
        businessAId,
        {
          supplierId: supplier.id,
          discountAmount: 50.0,
          taxAmount: 20.0,
          notes: "Urgent growing bags restock",
          items: [
            {
              productId: packagingProduct.id,
              quantity: 50,
              unitCost: 12.0,
            },
          ],
        },
        ownerUserId
      );

      expect(purchaseDraft.status).toBe(PurchaseStatus.DRAFT);
      expect(Number(purchaseDraft.subtotal)).toBe(600.0);
      expect(Number(purchaseDraft.discountAmount)).toBe(50.0);
      expect(Number(purchaseDraft.taxAmount)).toBe(20.0);
      expect(Number(purchaseDraft.totalAmount)).toBe(570.0);

      // Verify that draft purchase DOES NOT alter product stock
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: packagingProduct.id },
      });
      expect(Number(product.currentStock)).toBe(100);

      // Verify no financial transactions created yet
      const finTxCount = await prisma.financialTransaction.count({
        where: { purchaseId: purchaseDraft.id },
      });
      expect(finTxCount).toBe(0);
    });

    it("posts the purchase: increases stock atomically and creates Task 5 EXPENSE entry", async () => {
      const posted = await postPurchase(
        businessAId,
        purchaseDraft.id,
        PaymentMethod.BANK_TRANSFER,
        ownerUserId
      );

      expect(posted.status).toBe(PurchaseStatus.POSTED);
      expect(posted.postedAt).toBeDefined();

      // Verify stock increased by 50: 100 + 50 = 150
      const updatedProduct = await prisma.product.findUniqueOrThrow({
        where: { id: packagingProduct.id },
      });
      expect(Number(updatedProduct.currentStock)).toBe(150);

      // Verify Weighted Average Cost calculation:
      // (100 * 10 + 50 * 12) / 150 = 1600 / 150 = 10.67
      expect(Number(updatedProduct.unitCost)).toBe(10.67);

      // Verify Task 5 Financial Transaction (EXPENSE) created
      const finTx = await prisma.financialTransaction.findFirstOrThrow({
        where: { purchaseId: purchaseDraft.id },
        include: { category: true },
      });
      expect(finTx.type).toBe(TransactionType.EXPENSE);
      expect(Number(finTx.amount)).toBe(570.0);
      expect(finTx.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER);
      expect(finTx.category.name).toBe("Inventory Purchases");
    });

    it("rejects duplicate posting of an already posted purchase (idempotency)", async () => {
      await expect(
        postPurchase(businessAId, purchaseDraft.id, PaymentMethod.CASH, ownerUserId)
      ).rejects.toThrow(/Only DRAFT purchases can be posted/i);
    });

    it("executes a supplier return against posted purchase, decreasing stock", async () => {
      const returnResult = await recordSupplierReturn(
        businessAId,
        {
          purchaseId: purchaseDraft.id,
          reason: "Damaged seams on 10 bags",
          items: [{ productId: packagingProduct.id, quantity: 10, unitAmount: 12.0 }],
        },
        ownerUserId
      );

      expect(returnResult.success).toBe(true);
      expect(returnResult.creditAmount).toBe(120);
      expect(returnResult.financialTransactionId).toBeTruthy();

      const finTx = await prisma.financialTransaction.findUnique({
        where: { id: returnResult.financialTransactionId! },
        include: { category: true },
      });
      expect(finTx).toBeTruthy();
      expect(finTx?.type).toBe(TransactionType.INCOME);
      expect(finTx?.category.name).toBe("Purchase Returns & Credits");
      expect(Number(finTx?.amount)).toBe(120);

      // Stock should decrease by 10: 150 - 10 = 140
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: packagingProduct.id },
      });
      expect(Number(product.currentStock)).toBe(140);
    });

    it("cancels a draft purchase with zero side effects", async () => {
      const freshDraft = await createPurchaseDraft(
        businessAId,
        {
          supplierId: supplier.id,
          items: [{ productId: packagingProduct.id, quantity: 20, unitCost: 10.0 }],
        },
        ownerUserId
      );

      const cancelled = await cancelPurchaseDraft(businessAId, freshDraft.id, ownerUserId);
      expect(cancelled.status).toBe(PurchaseStatus.CANCELLED);

      // Stock remains unaffected
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: packagingProduct.id },
      });
      expect(Number(product.currentStock)).toBe(140);
    });
  });

  // ==========================================
  // 5. SALES WORKFLOW & FINANCE INTEGRATION
  // ==========================================
  describe("Sales Workflow with Stock Availability & Task 5 Revenue Integration", () => {
    let freshMushroomProduct: any;
    let customer: any;
    let orderDraft: any;

    beforeAll(async () => {
      customer = await createCustomer(
        businessAId,
        { name: "Organic Veggie Hub" },
        ownerUserId
      );

      freshMushroomProduct = await createProduct(
        businessAId,
        {
          name: "Button Mushrooms 250g",
          sku: "BUTTON-250G",
          category: ProductCategory.FRESH_MUSHROOM,
          unitOfMeasure: UnitOfMeasure.PACK,
          unitCost: 100.0,
          sellingPrice: 200.0,
          reorderThreshold: 10,
          initialStock: 30, // 30 packs in stock
        },
        ownerUserId
      );
    });

    it("creates a sales draft with server-calculated totals without deducting stock", async () => {
      // 10 packs at 200 = 2000, discount 100, tax 50 = 1950
      orderDraft = await createOrderDraft(
        businessAId,
        {
          customerId: customer.id,
          discountAmount: 100,
          taxAmount: 50,
          notes: "Scheduled weekly delivery",
          items: [
            {
              productId: freshMushroomProduct.id,
              quantity: 10,
              unitPrice: 200.0,
            },
          ],
        },
        ownerUserId
      );

      expect(orderDraft.status).toBe(OrderStatus.DRAFT);
      expect(Number(orderDraft.subtotal)).toBe(2000.0);
      expect(Number(orderDraft.discountAmount)).toBe(100.0);
      expect(Number(orderDraft.taxAmount)).toBe(50.0);
      expect(Number(orderDraft.totalAmount)).toBe(1950.0);

      // Stock must NOT be deducted by draft
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: freshMushroomProduct.id },
      });
      expect(Number(product.currentStock)).toBe(30);

      // No financial transactions yet
      const finCount = await prisma.financialTransaction.count({
        where: { orderId: orderDraft.id },
      });
      expect(finCount).toBe(0);
    });

    it("rejects posting an order when stock is insufficient", async () => {
      // Create a draft for 50 packs (only 30 in stock)
      const excessiveDraft = await createOrderDraft(
        businessAId,
        {
          customerId: customer.id,
          items: [{ productId: freshMushroomProduct.id, quantity: 50, unitPrice: 200 }],
        },
        ownerUserId
      );

      await expect(
        postOrder(businessAId, excessiveDraft.id, PaymentMethod.CASH, ownerUserId)
      ).rejects.toThrow(InsufficientStockError);

      // Stock still untouched
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: freshMushroomProduct.id },
      });
      expect(Number(product.currentStock)).toBe(30);
    });

    it("posts the sales order: deducts stock atomically and creates Task 5 INCOME entry", async () => {
      const posted = await postOrder(
        businessAId,
        orderDraft.id,
        PaymentMethod.CASH,
        ownerUserId
      );

      expect(posted.status).toBe(OrderStatus.CONFIRMED);
      expect(posted.postedAt).toBeDefined();

      // Stock deducted: 30 - 10 = 20
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: freshMushroomProduct.id },
      });
      expect(Number(product.currentStock)).toBe(20);

      // Task 5 Financial Transaction (INCOME) created
      const finTx = await prisma.financialTransaction.findFirstOrThrow({
        where: { orderId: orderDraft.id },
        include: { category: true },
      });
      expect(finTx.type).toBe(TransactionType.INCOME);
      expect(Number(finTx.amount)).toBe(1950.0);
      expect(finTx.paymentMethod).toBe(PaymentMethod.CASH);
      expect(finTx.category.name).toBe("Sales Revenue");
    });

    it("supports walk-in customer sales without requiring a permanent customer record", async () => {
      const walkInOrderDraft = await createOrderDraft(
        businessAId,
        {
          isWalkIn: true,
          walkInName: "Tourist Walk-in Buyer",
          items: [{ productId: freshMushroomProduct.id, quantity: 2, unitPrice: 200 }],
        },
        ownerUserId
      );

      expect(walkInOrderDraft.isWalkIn).toBe(true);
      expect(walkInOrderDraft.customerId).toBeNull();

      const postedWalkIn = await postOrder(
        businessAId,
        walkInOrderDraft.id,
        PaymentMethod.CASH,
        ownerUserId
      );

      expect(postedWalkIn.status).toBe(OrderStatus.CONFIRMED);

      // Stock deducted: 20 - 2 = 18
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: freshMushroomProduct.id },
      });
      expect(Number(product.currentStock)).toBe(18);
    });

    it("executes a customer return against a posted order, replenishing stock", async () => {
      const returnResult = await recordCustomerReturn(
        businessAId,
        {
          orderId: orderDraft.id,
          reason: "Customer ordered 2 extra packs by accident",
          items: [{ productId: freshMushroomProduct.id, quantity: 2, unitAmount: 200 }],
        },
        ownerUserId
      );

      expect(returnResult.success).toBe(true);
      expect(returnResult.refundAmount).toBe(400);
      expect(returnResult.financialTransactionId).toBeTruthy();

      const finTx = await prisma.financialTransaction.findUnique({
        where: { id: returnResult.financialTransactionId! },
        include: { category: true },
      });
      expect(finTx).toBeTruthy();
      expect(finTx?.type).toBe(TransactionType.EXPENSE);
      expect(finTx?.category.name).toBe("Sales Returns & Refunds");
      expect(Number(finTx?.amount)).toBe(400);

      // Stock replenished: 18 + 2 = 20
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: freshMushroomProduct.id },
      });
      expect(Number(product.currentStock)).toBe(20);
    });
  });

  // ==========================================
  // 6. CROSS-TENANT ISOLATION SAFEGUARDS
  // ==========================================
  describe("Cross-Tenant Isolation Safeguards", () => {
    let productInA: any;

    beforeAll(async () => {
      productInA = await prisma.product.findFirstOrThrow({
        where: { businessId: businessAId },
      });
    });

    it("rejects purchasing a product belonging to a different business tenant", async () => {
      const supplierInB = await createSupplier(
        businessBId,
        { name: "Beta Supplier" },
        ownerUserId
      );

      // Attempting to create a purchase in Business B referencing product from Business A
      await expect(
        createPurchaseDraft(
          businessBId,
          {
            supplierId: supplierInB.id,
            items: [{ productId: productInA.id, quantity: 5, unitCost: 10 }],
          },
          ownerUserId
        )
      ).rejects.toThrow(/does not belong to this business/i);
    });

    it("rejects selling a product belonging to a different business tenant", async () => {
      // Attempting to create an order in Business B referencing product from Business A
      await expect(
        createOrderDraft(
          businessBId,
          {
            isWalkIn: true,
            items: [{ productId: productInA.id, quantity: 2, unitPrice: 200 }],
          },
          ownerUserId
        )
      ).rejects.toThrow(/does not belong to this business/i);
    });

    it("rejects referencing a customer belonging to a different business tenant", async () => {
      const customerInA = await prisma.customer.findFirstOrThrow({
        where: { businessId: businessAId },
      });

      const productInB = await prisma.product.findFirstOrThrow({
        where: { businessId: businessBId },
      });

      await expect(
        createOrderDraft(
          businessBId,
          {
            customerId: customerInA.id, // belongs to Business A!
            items: [{ productId: productInB.id, quantity: 1, unitPrice: 100 }],
          },
          ownerUserId
        )
      ).rejects.toThrow(/Customer not found or unauthorized/i);
    });
  });
});
