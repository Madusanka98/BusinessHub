import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import {
  CustomerInput,
  SupplierInput,
  CustomerSchema,
  SupplierSchema,
} from "../schemas/commerce.schema";

// ==========================================
// CUSTOMER SERVICE
// ==========================================

export async function createCustomer(
  businessId: string,
  rawInput: CustomerInput,
  userId?: string
) {
  const input = CustomerSchema.parse(rawInput);
  return await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        businessId,
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        isActive: input.isActive ?? true,
      },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "CUSTOMER_CREATED",
        targetEntity: "Customer",
        targetId: customer.id,
        changeDetails: { name: customer.name },
      },
      tx
    );

    return customer;
  });
}

export async function updateCustomer(
  businessId: string,
  customerId: string,
  rawInput: CustomerInput,
  userId?: string
) {
  const input = CustomerSchema.parse(rawInput);
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!existing) {
    throw new Error("Customer not found or access denied.");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.customer.update({
      where: { id: customerId },
      data: {
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        isActive: input.isActive,
      },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "CUSTOMER_UPDATED",
        targetEntity: "Customer",
        targetId: customerId,
        changeDetails: { name: updated.name, isActive: updated.isActive },
      },
      tx
    );

    return updated;
  });
}

export async function getCustomers(
  businessId: string,
  options?: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }
) {
  const page = Math.max(options?.page ?? 1, 1);
  const limit = Math.max(options?.limit ?? 50, 1);
  const skip = (page - 1) * limit;

  const whereClause: Prisma.CustomerWhereInput = {
    businessId,
    ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
    ...(options?.search
      ? {
          OR: [
            { name: { contains: options.search } },
            { email: { contains: options.search } },
            { phone: { contains: options.search } },
          ],
        }
      : {}),
  };

  const [customers, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where: whereClause }),
  ]);

  return {
    customers,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

export async function getCustomerById(businessId: string, customerId: string) {
  return await prisma.customer.findFirst({
    where: { id: customerId, businessId },
    include: {
      orders: {
        orderBy: { orderDate: "desc" },
        take: 20,
      },
    },
  });
}

// ==========================================
// SUPPLIER SERVICE
// ==========================================

export async function createSupplier(
  businessId: string,
  rawInput: SupplierInput,
  userId?: string
) {
  const input = SupplierSchema.parse(rawInput);
  return await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({
      data: {
        businessId,
        name: input.name.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        isActive: input.isActive ?? true,
      },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "SUPPLIER_CREATED",
        targetEntity: "Supplier",
        targetId: supplier.id,
        changeDetails: { name: supplier.name },
      },
      tx
    );

    return supplier;
  });
}

export async function updateSupplier(
  businessId: string,
  supplierId: string,
  rawInput: SupplierInput,
  userId?: string
) {
  const input = SupplierSchema.parse(rawInput);
  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
  });

  if (!existing) {
    throw new Error("Supplier not found or access denied.");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.supplier.update({
      where: { id: supplierId },
      data: {
        name: input.name.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        isActive: input.isActive,
      },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "SUPPLIER_UPDATED",
        targetEntity: "Supplier",
        targetId: supplierId,
        changeDetails: { name: updated.name, isActive: updated.isActive },
      },
      tx
    );

    return updated;
  });
}

export async function getSuppliers(
  businessId: string,
  options?: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }
) {
  const page = Math.max(options?.page ?? 1, 1);
  const limit = Math.max(options?.limit ?? 50, 1);
  const skip = (page - 1) * limit;

  const whereClause: Prisma.SupplierWhereInput = {
    businessId,
    ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
    ...(options?.search
      ? {
          OR: [
            { name: { contains: options.search } },
            { contactPerson: { contains: options.search } },
            { email: { contains: options.search } },
          ],
        }
      : {}),
  };

  const [suppliers, totalCount] = await Promise.all([
    prisma.supplier.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.supplier.count({ where: whereClause }),
  ]);

  return {
    suppliers,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

export async function getSupplierById(businessId: string, supplierId: string) {
  return await prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
    include: {
      purchases: {
        orderBy: { purchaseDate: "desc" },
        take: 20,
      },
    },
  });
}
