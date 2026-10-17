import { z } from "zod";
import { ProductCategory, UnitOfMeasure, StockMovementType, PaymentMethod } from "@prisma/client";

// ==========================================
// PRODUCT SCHEMAS
// ==========================================

export const CreateProductSchema = z.object({
  name: z.string().trim().min(2, "Product name must be at least 2 characters").max(150),
  sku: z
    .string()
    .trim()
    .min(2, "SKU must be at least 2 characters")
    .max(50)
    .regex(/^[A-Za-z0-9-_.]+$/, "SKU may only contain letters, numbers, hyphens, underscores, and dots"),
  description: z.string().trim().max(1000).optional().nullable(),
  barcode: z.string().trim().max(100).optional().nullable(),
  category: z.nativeEnum(ProductCategory),
  unitOfMeasure: z.nativeEnum(UnitOfMeasure).default(UnitOfMeasure.PIECE),
  unitCost: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Unit cost must be a non-negative number"),
  sellingPrice: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Selling price must be a non-negative number"),
  reorderThreshold: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Reorder threshold must be non-negative")
    .default(10),
  initialStock: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Initial stock must be non-negative")
    .optional()
    .default(0),
});

export type CreateProductInput = z.input<typeof CreateProductSchema>;

export const UpdateProductSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
  name: z.string().trim().min(2, "Product name must be at least 2 characters").max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  barcode: z.string().trim().max(100).optional().nullable(),
  category: z.nativeEnum(ProductCategory),
  unitOfMeasure: z.nativeEnum(UnitOfMeasure),
  unitCost: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Unit cost must be a non-negative number"),
  sellingPrice: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Selling price must be a non-negative number"),
  reorderThreshold: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Reorder threshold must be non-negative"),
  isActive: z.boolean().default(true),
});

export type UpdateProductInput = z.input<typeof UpdateProductSchema>;

// ==========================================
// STOCK ADJUSTMENT SCHEMA
// ==========================================

export const CreateStockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  type: z.enum([
    StockMovementType.ADJUSTMENT_ADD,
    StockMovementType.ADJUSTMENT_SCRAP,
    StockMovementType.ADJUSTMENT_AUDIT,
  ]),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val !== 0, "Adjustment quantity cannot be zero"),
  notes: z.string().trim().min(3, "Reason/notes are required for an audit trail").max(500),
});

export type CreateStockAdjustmentInput = z.input<typeof CreateStockAdjustmentSchema>;

// ==========================================
// CONTACT SCHEMAS (CUSTOMER & SUPPLIER)
// ==========================================

export const CustomerSchema = z.object({
  name: z.string().trim().min(2, "Customer name must be at least 2 characters").max(150),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type CustomerInput = z.input<typeof CustomerSchema>;

export const SupplierSchema = z.object({
  name: z.string().trim().min(2, "Supplier name must be at least 2 characters").max(150),
  contactPerson: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type SupplierInput = z.input<typeof SupplierSchema>;

// ==========================================
// PURCHASING SCHEMAS
// ==========================================

export const PurchaseItemLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, "Quantity must be greater than zero"),
  unitCost: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Unit cost must be non-negative"),
});

export const CreatePurchaseSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  purchaseDate: z.string().optional().default(() => new Date().toISOString()),
  notes: z.string().trim().max(500).optional(),
  discountAmount: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Discount must be non-negative")
    .optional()
    .default(0),
  taxAmount: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Tax must be non-negative")
    .optional()
    .default(0),
  items: z.array(PurchaseItemLineSchema).min(1, "At least one purchase item is required"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
});

export type CreatePurchaseInput = z.input<typeof CreatePurchaseSchema>;

// ==========================================
// SALES ORDER SCHEMAS
// ==========================================

export const OrderItemLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, "Quantity must be greater than zero"),
  unitPrice: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Unit price must be non-negative"),
});

export const CreateOrderSchema = z.object({
  customerId: z.string().optional().nullable(),
  isWalkIn: z.boolean().default(false),
  walkInName: z.string().trim().max(100).optional().nullable(),
  orderDate: z.string().optional().default(() => new Date().toISOString()),
  notes: z.string().trim().max(500).optional(),
  discountAmount: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Discount must be non-negative")
    .optional()
    .default(0),
  taxAmount: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Tax must be non-negative")
    .optional()
    .default(0),
  items: z.array(OrderItemLineSchema).min(1, "At least one order item is required"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
}).refine(
  (data) => data.isWalkIn || (data.customerId && data.customerId.trim().length > 0),
  {
    message: "A customer must be selected or walk-in customer indicated",
    path: ["customerId"],
  }
);

export type CreateOrderInput = z.input<typeof CreateOrderSchema>;

// ==========================================
// RETURNS SCHEMAS
// ==========================================

export const ReturnItemLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, "Return quantity must be greater than zero"),
  unitAmount: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, "Unit amount must be non-negative"),
});

export const CreateCustomerReturnSchema = z.object({
  orderId: z.string().min(1, "Order reference is required"),
  reason: z.string().trim().min(3, "Return reason is required").max(500),
  items: z.array(ReturnItemLineSchema).min(1, "At least one item is required for return"),
});

export type CreateCustomerReturnInput = z.infer<typeof CreateCustomerReturnSchema>;

export const CreateSupplierReturnSchema = z.object({
  purchaseId: z.string().min(1, "Purchase reference is required"),
  reason: z.string().trim().min(3, "Return reason is required").max(500),
  items: z.array(ReturnItemLineSchema).min(1, "At least one item is required for return"),
});

export type CreateSupplierReturnInput = z.infer<typeof CreateSupplierReturnSchema>;
