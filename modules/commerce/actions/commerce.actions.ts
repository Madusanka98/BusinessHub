"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import { PaymentMethod } from "@prisma/client";
import {
  CreateProductSchema,
  UpdateProductSchema,
  CreateStockAdjustmentSchema,
  CustomerSchema,
  SupplierSchema,
  CreatePurchaseSchema,
  CreateOrderSchema,
  CreateCustomerReturnSchema,
  CreateSupplierReturnSchema,
} from "../schemas/commerce.schema";
import {
  createProduct,
  updateProduct,
  archiveProduct,
} from "../services/product.service";
import { adjustStock } from "../services/stock.service";
import {
  createCustomer,
  updateCustomer,
  createSupplier,
  updateSupplier,
} from "../services/contact.service";
import {
  createPurchaseDraft,
  postPurchase,
  cancelPurchaseDraft,
  recordSupplierReturn,
} from "../services/purchase.service";
import {
  createOrderDraft,
  postOrder,
  cancelOrderDraft,
  recordCustomerReturn,
} from "../services/sale.service";

export interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  message?: string;
  data?: Record<string, unknown>;
}

// ==========================================
// PRODUCT ACTIONS
// ==========================================

export async function createProductAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "inventory:products:manage");

    const rawData = {
      name: formData.get("name"),
      sku: formData.get("sku"),
      description: formData.get("description") || undefined,
      barcode: formData.get("barcode") || undefined,
      category: formData.get("category"),
      unitOfMeasure: formData.get("unitOfMeasure"),
      unitCost: formData.get("unitCost"),
      sellingPrice: formData.get("sellingPrice"),
      reorderThreshold: formData.get("reorderThreshold") || 10,
      initialStock: formData.get("initialStock") || 0,
    };

    const parsed = CreateProductSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Product validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await createProduct(context.businessId, parsed.data, context.userId);

    revalidatePath("/inventory");
    revalidatePath("/inventory/products");
    return { success: true, message: "Product created successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create product.",
    };
  }
}

export async function updateProductAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "inventory:products:manage");

    const rawData = {
      id: formData.get("id"),
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      barcode: formData.get("barcode") || undefined,
      category: formData.get("category"),
      unitOfMeasure: formData.get("unitOfMeasure"),
      unitCost: formData.get("unitCost"),
      sellingPrice: formData.get("sellingPrice"),
      reorderThreshold: formData.get("reorderThreshold"),
      isActive: formData.get("isActive") === "true",
    };

    const parsed = UpdateProductSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Product update validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await updateProduct(context.businessId, parsed.data, context.userId);

    revalidatePath("/inventory");
    revalidatePath("/inventory/products");
    return { success: true, message: "Product updated successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update product.",
    };
  }
}

export async function archiveProductAction(productId: string): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "inventory:products:manage");

    await archiveProduct(context.businessId, productId, context.userId);

    revalidatePath("/inventory");
    revalidatePath("/inventory/products");
    return { success: true, message: "Product archived successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to archive product.",
    };
  }
}

// ==========================================
// STOCK ADJUSTMENT ACTION
// ==========================================

export async function adjustStockAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "inventory:stock:adjust");

    const rawData = {
      productId: formData.get("productId"),
      type: formData.get("type"),
      quantity: formData.get("quantity"),
      notes: formData.get("notes"),
    };

    const parsed = CreateStockAdjustmentSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Stock adjustment validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await adjustStock(context.businessId, parsed.data, context.userId);

    revalidatePath("/inventory");
    revalidatePath("/inventory/products");
    revalidatePath("/inventory/movements");
    return { success: true, message: "Stock adjusted successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to adjust stock.",
    };
  }
}

// ==========================================
// CUSTOMER & SUPPLIER ACTIONS
// ==========================================

export async function createCustomerAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "contacts:manage");

    const rawData = {
      name: formData.get("name"),
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      address: formData.get("address") || undefined,
      notes: formData.get("notes") || undefined,
      isActive: formData.get("isActive") !== "false",
    };

    const parsed = CustomerSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Customer validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await createCustomer(context.businessId, parsed.data, context.userId);

    revalidatePath("/inventory/contacts");
    return { success: true, message: "Customer created successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create customer.",
    };
  }
}

export async function updateCustomerAction(
  customerId: string,
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "contacts:manage");

    const rawData = {
      name: formData.get("name"),
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      address: formData.get("address") || undefined,
      notes: formData.get("notes") || undefined,
      isActive: formData.get("isActive") !== "false",
    };

    const parsed = CustomerSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Customer validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await updateCustomer(context.businessId, customerId, parsed.data, context.userId);

    revalidatePath("/inventory/contacts");
    return { success: true, message: "Customer updated successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update customer.",
    };
  }
}

export async function createSupplierAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "contacts:manage");

    const rawData = {
      name: formData.get("name"),
      contactPerson: formData.get("contactPerson") || undefined,
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      address: formData.get("address") || undefined,
      notes: formData.get("notes") || undefined,
      isActive: formData.get("isActive") !== "false",
    };

    const parsed = SupplierSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Supplier validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await createSupplier(context.businessId, parsed.data, context.userId);

    revalidatePath("/inventory/contacts");
    return { success: true, message: "Supplier created successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create supplier.",
    };
  }
}

export async function updateSupplierAction(
  supplierId: string,
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "contacts:manage");

    const rawData = {
      name: formData.get("name"),
      contactPerson: formData.get("contactPerson") || undefined,
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      address: formData.get("address") || undefined,
      notes: formData.get("notes") || undefined,
      isActive: formData.get("isActive") !== "false",
    };

    const parsed = SupplierSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: "Supplier validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await updateSupplier(context.businessId, supplierId, parsed.data, context.userId);

    revalidatePath("/inventory/contacts");
    return { success: true, message: "Supplier updated successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update supplier.",
    };
  }
}

// ==========================================
// PURCHASING ACTIONS
// ==========================================

export async function createPurchaseAction(
  input: {
    supplierId: string;
    purchaseDate?: string;
    notes?: string;
    discountAmount?: number;
    taxAmount?: number;
    paymentMethod?: PaymentMethod;
    items: { productId: string; quantity: number; unitCost: number }[];
  }
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "purchases:manage");

    const parsed = CreatePurchaseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Purchase validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const purchase = await createPurchaseDraft(context.businessId, parsed.data, context.userId);

    revalidatePath("/inventory/purchases");
    return {
      success: true,
      message: "Purchase draft created successfully.",
      data: { purchaseId: purchase.id },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create purchase.",
    };
  }
}

export async function postPurchaseAction(
  purchaseId: string,
  paymentMethod: PaymentMethod = PaymentMethod.CASH
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "purchases:manage");

    await postPurchase(context.businessId, purchaseId, paymentMethod, context.userId);

    revalidatePath("/inventory");
    revalidatePath("/inventory/products");
    revalidatePath("/inventory/movements");
    revalidatePath("/inventory/purchases");
    revalidatePath("/finance/transactions");
    return { success: true, message: "Purchase order posted, stock received, and expense recorded." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to post purchase.",
    };
  }
}

export async function cancelPurchaseAction(purchaseId: string): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "purchases:manage");

    await cancelPurchaseDraft(context.businessId, purchaseId, context.userId);

    revalidatePath("/inventory/purchases");
    return { success: true, message: "Purchase draft cancelled." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel purchase.",
    };
  }
}

export async function recordSupplierReturnAction(
  input: {
    purchaseId: string;
    reason: string;
    items: { productId: string; quantity: number; unitAmount: number }[];
  }
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "purchases:manage");

    const parsed = CreateSupplierReturnSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Supplier return validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await recordSupplierReturn(context.businessId, parsed.data, context.userId);

    revalidatePath("/inventory");
    revalidatePath("/inventory/products");
    revalidatePath("/inventory/movements");
    revalidatePath("/inventory/purchases");
    revalidatePath("/finance/transactions");
    return { success: true, message: "Supplier return processed and stock adjusted." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to process supplier return.",
    };
  }
}

// ==========================================
// SALES ORDER ACTIONS
// ==========================================

export async function createOrderAction(
  input: {
    customerId?: string | null;
    isWalkIn?: boolean;
    walkInName?: string | null;
    orderDate?: string;
    notes?: string;
    discountAmount?: number;
    taxAmount?: number;
    paymentMethod?: PaymentMethod;
    items: { productId: string; quantity: number; unitPrice: number }[];
  }
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "sales:orders:manage");

    const parsed = CreateOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Sales order validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const order = await createOrderDraft(context.businessId, parsed.data, context.userId);

    revalidatePath("/inventory/sales");
    return {
      success: true,
      message: "Sales order draft created successfully.",
      data: { orderId: order.id },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create sales order.",
    };
  }
}

export async function postOrderAction(
  orderId: string,
  paymentMethod: PaymentMethod = PaymentMethod.CASH
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "sales:orders:manage");

    await postOrder(context.businessId, orderId, paymentMethod, context.userId);

    revalidatePath("/inventory");
    revalidatePath("/inventory/products");
    revalidatePath("/inventory/movements");
    revalidatePath("/inventory/sales");
    revalidatePath("/finance/transactions");
    return { success: true, message: "Sales order posted, stock deducted, and revenue recorded." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to post sales order.",
    };
  }
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "sales:orders:manage");

    await cancelOrderDraft(context.businessId, orderId, context.userId);

    revalidatePath("/inventory/sales");
    return { success: true, message: "Sales order draft cancelled." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel sales order.",
    };
  }
}

export async function recordCustomerReturnAction(
  input: {
    orderId: string;
    reason: string;
    items: { productId: string; quantity: number; unitAmount: number }[];
  }
): Promise<ActionResult> {
  try {
    const context = await getTenantContext();
    assertTenantPermission(context, "sales:orders:manage");

    const parsed = CreateCustomerReturnSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Customer return validation failed.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await recordCustomerReturn(context.businessId, parsed.data, context.userId);

    revalidatePath("/inventory");
    revalidatePath("/inventory/products");
    revalidatePath("/inventory/movements");
    revalidatePath("/inventory/sales");
    revalidatePath("/finance/transactions");
    return { success: true, message: "Customer return processed and stock replenished." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to process customer return.",
    };
  }
}
