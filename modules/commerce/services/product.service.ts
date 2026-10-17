import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma, ProductCategory, StockMovementType } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import {
  CreateProductInput,
  UpdateProductInput,
  CreateProductSchema,
  UpdateProductSchema,
} from "../schemas/commerce.schema";

/**
 * Creates a new product for the specified business tenant.
 * If initialStock is specified and > 0, an immutable OPENING_STOCK movement is recorded.
 */
export async function createProduct(
  businessId: string,
  rawInput: CreateProductInput,
  userId?: string
) {
  const input = CreateProductSchema.parse(rawInput);
  // Check SKU uniqueness within the tenant
  const existingSku = await prisma.product.findUnique({
    where: {
      businessId_sku: {
        businessId,
        sku: input.sku,
      },
    },
  });

  if (existingSku) {
    throw new Error(`A product with SKU "${input.sku}" already exists in this business.`);
  }

  // Check Barcode uniqueness if barcode is provided
  if (input.barcode && input.barcode.trim()) {
    const existingBarcode = await prisma.product.findFirst({
      where: {
        businessId,
        barcode: input.barcode.trim(),
      },
    });

    if (existingBarcode) {
      throw new Error(`A product with Barcode "${input.barcode.trim()}" already exists in this business.`);
    }
  }

  return await prisma.$transaction(async (tx) => {
    const initialQty = input.initialStock ?? 0;

    const product = await tx.product.create({
      data: {
        businessId,
        sku: input.sku.trim(),
        name: input.name.trim(),
        description: input.description?.trim() || null,
        barcode: input.barcode?.trim() || null,
        category: input.category,
        unitOfMeasure: input.unitOfMeasure,
        unitCost: new Prisma.Decimal(input.unitCost.toFixed(2)),
        sellingPrice: new Prisma.Decimal(input.sellingPrice.toFixed(2)),
        reorderThreshold: new Prisma.Decimal(input.reorderThreshold.toFixed(3)),
        currentStock: new Prisma.Decimal(initialQty.toFixed(3)),
        isActive: true,
      },
    });

    if (initialQty > 0) {
      await tx.stockMovement.create({
        data: {
          businessId,
          productId: product.id,
          type: StockMovementType.OPENING_STOCK,
          quantity: new Prisma.Decimal(initialQty.toFixed(3)),
          balanceAfter: new Prisma.Decimal(initialQty.toFixed(3)),
          notes: "Initial opening stock recorded at product creation",
          createdById: userId ?? null,
        },
      });
    }

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "PRODUCT_CREATED",
        targetEntity: "Product",
        targetId: product.id,
        changeDetails: {
          sku: product.sku,
          name: product.name,
          category: product.category,
          initialStock: initialQty,
        },
      },
      tx
    );

    return product;
  });
}

/**
 * Updates an existing product's non-stock details.
 * Stock quantity can NEVER be updated here; it must go through StockMovement.
 */
export async function updateProduct(
  businessId: string,
  rawInput: UpdateProductInput,
  userId?: string
) {
  const input = UpdateProductSchema.parse(rawInput);
  const existing = await prisma.product.findFirst({
    where: {
      id: input.id,
      businessId,
    },
  });

  if (!existing) {
    throw new Error("Product not found or unauthorized.");
  }

  if (input.barcode && input.barcode.trim()) {
    const duplicateBarcode = await prisma.product.findFirst({
      where: {
        businessId,
        barcode: input.barcode.trim(),
        NOT: { id: input.id },
      },
    });

    if (duplicateBarcode) {
      throw new Error(`Barcode "${input.barcode.trim()}" is already assigned to another product.`);
    }
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        barcode: input.barcode?.trim() || null,
        category: input.category,
        unitOfMeasure: input.unitOfMeasure,
        unitCost: new Prisma.Decimal(input.unitCost.toFixed(2)),
        sellingPrice: new Prisma.Decimal(input.sellingPrice.toFixed(2)),
        reorderThreshold: new Prisma.Decimal(input.reorderThreshold.toFixed(3)),
        isActive: input.isActive,
      },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "PRODUCT_UPDATED",
        targetEntity: "Product",
        targetId: updated.id,
        changeDetails: {
          name: updated.name,
          isActive: updated.isActive,
          sellingPrice: updated.sellingPrice.toString(),
        },
      },
      tx
    );

    return updated;
  });
}

/**
 * Archives (soft-deactivates) a product.
 */
export async function archiveProduct(
  businessId: string,
  productId: string,
  userId?: string
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });

  if (!product) {
    throw new Error("Product not found or unauthorized.");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: productId },
      data: { isActive: false },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "PRODUCT_ARCHIVED",
        targetEntity: "Product",
        targetId: productId,
        changeDetails: { sku: product.sku, name: product.name },
      },
      tx
    );

    return updated;
  });
}

/**
 * Gets a single product by ID scoped to the business.
 */
export async function getProductById(businessId: string, productId: string) {
  return await prisma.product.findFirst({
    where: { id: productId, businessId },
    include: {
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

/**
 * Retrieves products for the business with optional search, category filter, and low-stock filtering.
 */
export async function getProducts(
  businessId: string,
  options?: {
    search?: string;
    category?: ProductCategory;
    isActive?: boolean;
    lowStockOnly?: boolean;
    page?: number;
    limit?: number;
  }
) {
  const page = Math.max(options?.page ?? 1, 1);
  const limit = Math.max(options?.limit ?? 50, 1);
  const skip = (page - 1) * limit;

  const whereClause: Prisma.ProductWhereInput = {
    businessId,
    ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
    ...(options?.category ? { category: options.category } : {}),
    ...(options?.search
      ? {
          OR: [
            { name: { contains: options.search } },
            { sku: { contains: options.search } },
            { barcode: { contains: options.search } },
          ],
        }
      : {}),
  };

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where: whereClause }),
  ]);

  const filtered = options?.lowStockOnly
    ? products.filter((p) => Number(p.currentStock) <= Number(p.reorderThreshold))
    : products;

  return {
    products: filtered,
    totalCount: options?.lowStockOnly ? filtered.length : totalCount,
    page,
    limit,
    totalPages: Math.ceil((options?.lowStockOnly ? filtered.length : totalCount) / limit),
  };
}
