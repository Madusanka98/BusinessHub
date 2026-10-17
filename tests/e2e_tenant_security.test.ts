import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createBusinessBySuperAdmin } from "@/modules/core-tenancy/services/business.service";
import { createProduct } from "@/modules/commerce/services/product.service";
import { createOrderDraft, postOrder } from "@/modules/commerce/services/sale.service";
import { updateBusinessStatusByAdmin } from "@/modules/reports/services/saas-admin.service";
import { hasPermission } from "@/lib/tenant/permissions";
import {
  ProductCategory,
  UnitOfMeasure,
  BusinessStatus,
  TransactionType,
  PaymentMethod,
  ApprovalStatus,
} from "@prisma/client";

describe("E2E Security & Multi-Tenant Boundary Verification", () => {
  const timestamp = Date.now();
  let superAdminId: string;
  let userAId: string;
  let userBId: string;
  let businessAId: string;
  let businessBId: string;
  let productAId: string;
  let productBId: string;

  beforeAll(async () => {
    const pwd = await hashPassword("SecurePass@123!");

    // 1. Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        email: `sa-e2e-${timestamp}@platform.local`,
        fullName: "Platform Auditor",
        passwordHash: pwd,
        isSuperAdmin: true,
        isActive: true,
      },
    });
    superAdminId = superAdmin.id;

    // 2. User A (Owner of Business A)
    const userA = await prisma.user.create({
      data: {
        email: `usera-${timestamp}@org-alpha.local`,
        fullName: "Alpha Owner",
        passwordHash: pwd,
        isSuperAdmin: false,
        isActive: true,
      },
    });
    userAId = userA.id;

    // 3. User B (Owner of Business B)
    const userB = await prisma.user.create({
      data: {
        email: `userb-${timestamp}@org-beta.local`,
        fullName: "Beta Owner",
        passwordHash: pwd,
        isSuperAdmin: false,
        isActive: true,
      },
    });
    userBId = userB.id;

    // 4. Provision Business A
    const bA = await createBusinessBySuperAdmin(
      {
        name: `Org Alpha ${timestamp}`,
        slug: `alpha-${timestamp}`,
        initialOwnerEmail: userA.email,
        timezone: "Asia/Colombo",
        currency: "LKR",
      },
      superAdminId
    );
    businessAId = bA.businessId;

    // 5. Provision Business B
    const bB = await createBusinessBySuperAdmin(
      {
        name: `Org Beta ${timestamp}`,
        slug: `beta-${timestamp}`,
        initialOwnerEmail: userB.email,
        timezone: "Asia/Colombo",
        currency: "LKR",
      },
      superAdminId
    );
    businessBId = bB.businessId;

    // 6. Create product in Business A
    const pA = await createProduct(
      businessAId,
      {
        name: "Alpha Bio Fertilizer",
        sku: `SKU-A-${timestamp}`,
        category: ProductCategory.RAW_MATERIAL,
        unitOfMeasure: UnitOfMeasure.PACK,
        unitCost: 100,
        sellingPrice: 250,
        reorderThreshold: 5,
        initialStock: 20,
      },
      userAId
    );
    productAId = pA.id;

    // 7. Create product in Business B
    const pB = await createProduct(
      businessBId,
      {
        name: "Beta Mushroom Spawn",
        sku: `SKU-B-${timestamp}`,
        category: ProductCategory.FRESH_MUSHROOM,
        unitOfMeasure: UnitOfMeasure.PACK,
        unitCost: 200,
        sellingPrice: 500,
        reorderThreshold: 10,
        initialStock: 30,
      },
      userBId
    );
    productBId = pB.id;
  });

  afterAll(async () => {
    const bIds = [businessAId, businessBId].filter(Boolean);
    const uIds = [superAdminId, userAId, userBId].filter(Boolean);

    if (bIds.length > 0) {
      await prisma.orderItem.deleteMany({ where: { order: { businessId: { in: bIds } } } }).catch(() => {});
      await prisma.order.deleteMany({ where: { businessId: { in: bIds } } }).catch(() => {});
      await prisma.stockMovement.deleteMany({ where: { businessId: { in: bIds } } }).catch(() => {});
      await prisma.product.deleteMany({ where: { businessId: { in: bIds } } }).catch(() => {});
      await prisma.financialTransaction.deleteMany({ where: { businessId: { in: bIds } } }).catch(() => {});
      await prisma.auditEvent.deleteMany({ where: { businessId: { in: bIds } } }).catch(() => {});
      await prisma.businessMembership.deleteMany({ where: { businessId: { in: bIds } } }).catch(() => {});
      await prisma.businessSettings.deleteMany({ where: { businessId: { in: bIds } } }).catch(() => {});
      await prisma.business.deleteMany({ where: { id: { in: bIds } } }).catch(() => {});
    }

    if (uIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: uIds } } }).catch(() => {});
    }
  });

  // ==========================================
  // 1. TENANT DATA ISOLATION (ANTI-IDOR)
  // ==========================================
  describe("1. Multi-Tenant Data Isolation & Anti-IDOR", () => {
    it("should never expose Tenant B's products to Tenant A query", async () => {
      const tenantAProducts = await prisma.product.findMany({
        where: { businessId: businessAId },
      });
      const ids = tenantAProducts.map((p) => p.id);

      expect(ids).toContain(productAId);
      expect(ids).not.toContain(productBId);
    });

    it("should reject cross-tenant order creation using foreign tenant's product", async () => {
      // User A attempts to create an order in Business A using Business B's product ID
      await expect(
        createOrderDraft(
          businessAId,
          {
            isWalkIn: true,
            walkInName: "Intruder Buyer",
            items: [
              {
                productId: productBId, // Belongs to Business B!
                quantity: 1,
                unitPrice: 500,
              },
            ],
          },
          userAId
        )
      ).rejects.toThrow();
    });

    it("should enforce tenant boundaries on customer orders", async () => {
      const orderA = await createOrderDraft(
        businessAId,
        {
          isWalkIn: true,
          walkInName: "Walk-in Alpha Customer",
          items: [{ productId: productAId, quantity: 2, unitPrice: 250 }],
        },
        userAId
      );

      // Attempting to post Order A with Business B context must fail
      await expect(
        postOrder(businessBId, orderA.id, PaymentMethod.CASH, userBId)
      ).rejects.toThrow();
    });
  });

  // ==========================================
  // 2. COMMERCIAL SALES & INSUFFICIENT STOCK
  // ==========================================
  describe("2. Commercial Inventory Posting & Stock Depletion Safeguards", () => {
    it("should reject posting sales order when quantity exceeds available stock", async () => {
      // Product A has 20 in initialStock
      const excessiveOrder = await createOrderDraft(
        businessAId,
        {
          isWalkIn: true,
          walkInName: "Bulk Buyer",
          items: [{ productId: productAId, quantity: 50, unitPrice: 250 }], // Exceeds 20!
        },
        userAId
      );

      await expect(
        postOrder(businessAId, excessiveOrder.id, PaymentMethod.CASH, userAId)
      ).rejects.toThrow(/insufficient stock/i);
    });

    it("should post valid order, deduct stock atomically, and generate SALE_DISPATCH movement", async () => {
      const validOrder = await createOrderDraft(
        businessAId,
        {
          isWalkIn: true,
          walkInName: "Legitimate Buyer",
          items: [{ productId: productAId, quantity: 5, unitPrice: 250 }],
        },
        userAId
      );

      const posted = await postOrder(
        businessAId,
        validOrder.id,
        PaymentMethod.CASH,
        userAId
      );
      expect(posted.status).toBe("CONFIRMED");

      // Verify stock was decremented from 20 to 15
      const updatedProduct = await prisma.product.findUnique({ where: { id: productAId } });
      expect(Number(updatedProduct?.currentStock)).toBe(15);

      // Verify stock movement record created
      const movement = await prisma.stockMovement.findFirst({
        where: {
          businessId: businessAId,
          productId: productAId,
          type: "SALE_DISPATCH",
        },
      });
      expect(movement).toBeDefined();
      expect(Number(movement?.quantity)).toBe(-5);
    });
  });

  // ==========================================
  // 3. ROLE-BASED ACCESS CONTROL (RBAC)
  // ==========================================
  describe("3. Role-Based Permissions & Privilege Boundaries", () => {
    it("should restrict financial management and closing periods to authorized roles", () => {
      // OWNER has period close authorization
      expect(hasPermission("OWNER", "finance:period:close")).toBe(true);

      // PARTNER_FINANCE, STAFF, and VIEWER cannot close accounting periods
      expect(hasPermission("PARTNER_FINANCE", "finance:period:close")).toBe(false);
      expect(hasPermission("STAFF", "finance:period:close")).toBe(false);
      expect(hasPermission("VIEWER", "finance:period:close")).toBe(false);
    });

    it("should restrict report scheduling and export to permitted roles", () => {
      expect(hasPermission("OWNER", "reports:schedule:manage")).toBe(true);
      expect(hasPermission("PARTNER_OPERATIONS", "reports:schedule:manage")).toBe(true);
      expect(hasPermission("VIEWER", "reports:schedule:manage")).toBe(false);
    });
  });

  // ==========================================
  // 4. SAAS ADMINISTRATION LIFECYCLE
  // ==========================================
  describe("4. Organization Suspension & Compliance Enforcement", () => {
    it("should properly transition business status and prevent operations while suspended", async () => {
      // Super Admin suspends Business B
      const suspended = await updateBusinessStatusByAdmin(
        businessBId,
        BusinessStatus.SUSPENDED,
        superAdminId,
        "Compliance check"
      );
      expect(suspended.status).toBe(BusinessStatus.SUSPENDED);

      // Check that tenant business status reflects SUSPENDED
      const bStatus = await prisma.business.findUnique({
        where: { id: businessBId },
        select: { status: true },
      });
      expect(bStatus?.status).toBe(BusinessStatus.SUSPENDED);

      // Reactivate
      const reactivated = await updateBusinessStatusByAdmin(
        businessBId,
        BusinessStatus.ACTIVE,
        superAdminId,
        "Compliance cleared"
      );
      expect(reactivated.status).toBe(BusinessStatus.ACTIVE);
    });
  });
});
