import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  Prisma,
  OrderStatus,
  StockMovementType,
  TransactionType,
  PaymentStatus,
  PaymentMethod,
  ApprovalStatus,
} from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import { recordStockMovement } from "./stock.service";
import {
  CreateOrderInput,
  CreateCustomerReturnInput,
  CreateOrderSchema,
} from "../schemas/commerce.schema";

/**
 * Finds or creates an income category for sales revenue.
 */
async function getOrCreateSalesIncomeCategory(
  businessId: string,
  tx: Prisma.TransactionClient
): Promise<string> {
  const existing = await tx.transactionCategory.findFirst({
    where: {
      businessId,
      name: "Sales Revenue",
      type: TransactionType.INCOME,
    },
  });

  if (existing) return existing.id;

  const created = await tx.transactionCategory.create({
    data: {
      businessId,
      name: "Sales Revenue",
      type: TransactionType.INCOME,
    },
  });

  return created.id;
}

/**
 * Finds or creates an expense category for customer returns and refunds.
 */
async function getOrCreateSalesRefundExpenseCategory(
  businessId: string,
  tx: Prisma.TransactionClient
): Promise<string> {
  const existing = await tx.transactionCategory.findFirst({
    where: {
      businessId,
      name: "Sales Returns & Refunds",
      type: TransactionType.EXPENSE,
    },
  });

  if (existing) return existing.id;

  const created = await tx.transactionCategory.create({
    data: {
      businessId,
      name: "Sales Returns & Refunds",
      type: TransactionType.EXPENSE,
    },
  });

  return created.id;
}

/**
 * Generates an incremented sales order document number (e.g., SO-0001, SO-0002).
 */
async function generateOrderNumber(
  businessId: string,
  tx: Prisma.TransactionClient
): Promise<string> {
  const count = await tx.order.count({ where: { businessId } });
  const padded = String(count + 1).padStart(4, "0");
  return `SO-${padded}`;
}

/**
 * Creates a DRAFT sales order.
 * A draft DOES NOT deduct stock or create finance entries.
 */
export async function createOrderDraft(
  businessId: string,
  rawInput: CreateOrderInput,
  userId?: string
) {
  const input = CreateOrderSchema.parse(rawInput);
  // Validate customer if not walk-in
  if (!input.isWalkIn && input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, businessId },
    });

    if (!customer) {
      throw new Error("Customer not found or unauthorized.");
    }
  }

  return await prisma.$transaction(async (tx) => {
    let subtotalNum = 0;
    const validatedItems: {
      productId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (const item of input.items) {
      const product = await tx.product.findFirst({
        where: { id: item.productId, businessId },
      });

      if (!product) {
        throw new Error(`Product ${item.productId} does not belong to this business.`);
      }

      const itemQty = item.quantity;
      const itemPrice = item.unitPrice;
      const itemSubtotal = Number((itemQty * itemPrice).toFixed(2));
      subtotalNum += itemSubtotal;

      validatedItems.push({
        productId: product.id,
        quantity: itemQty,
        unitPrice: itemPrice,
        subtotal: itemSubtotal,
      });
    }

    const discountNum = input.discountAmount ?? 0;
    const taxNum = input.taxAmount ?? 0;
    const totalNum = Number((subtotalNum - discountNum + taxNum).toFixed(2));

    const orderNumber = await generateOrderNumber(businessId, tx);

    const order = await tx.order.create({
      data: {
        businessId,
        customerId: input.isWalkIn ? null : input.customerId || null,
        isWalkIn: input.isWalkIn ?? false,
        walkInName: input.isWalkIn ? input.walkInName?.trim() || "Walk-in Customer" : null,
        orderNumber,
        status: OrderStatus.DRAFT,
        paymentStatus: PaymentStatus.UNPAID,
        orderDate: input.orderDate ? new Date(input.orderDate) : new Date(),
        subtotal: new Prisma.Decimal(subtotalNum.toFixed(2)),
        discountAmount: new Prisma.Decimal(discountNum.toFixed(2)),
        taxAmount: new Prisma.Decimal(taxNum.toFixed(2)),
        totalAmount: new Prisma.Decimal(totalNum.toFixed(2)),
        notes: input.notes?.trim() || null,
        createdById: userId ?? null,
        items: {
          create: validatedItems.map((item) => ({
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity.toFixed(3)),
            unitPrice: new Prisma.Decimal(item.unitPrice.toFixed(2)),
            subtotal: new Prisma.Decimal(item.subtotal.toFixed(2)),
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
        customer: true,
      },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "SALES_ORDER_DRAFT_CREATED",
        targetEntity: "Order",
        targetId: order.id,
        changeDetails: {
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount.toString(),
          isWalkIn: order.isWalkIn,
        },
      },
      tx
    );

    return order;
  });
}

/**
 * Posts an approved sales order:
 * 1. Validates status is DRAFT.
 * 2. Atomically validates sufficient stock for every product line item.
 * 3. Records atomic StockMovement (SALE_DISPATCH) for each line item, decreasing stock.
 * 4. Creates linked FinancialTransaction (INCOME) in Task 5 Finance module.
 * 5. Updates order status to CONFIRMED and payment status to PAID.
 * 6. Everything commits in a single ACID transaction boundary.
 */
export async function postOrder(
  businessId: string,
  orderId: string,
  paymentMethod: PaymentMethod = PaymentMethod.CASH,
  userId?: string
) {
  return await prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, businessId },
        include: {
          items: {
            include: { product: true },
          },
          customer: true,
        },
      });

      if (!order) {
        throw new Error("Sales order not found or unauthorized.");
      }

      if (order.status !== OrderStatus.DRAFT) {
        throw new Error(`Cannot post order in status "${order.status}". Only DRAFT orders can be posted.`);
      }

      // 1. Process stock deductions atomically (SALE_DISPATCH)
      // recordStockMovement enforces non-negative stock and throws InsufficientStockError if unavailable
      for (const item of order.items) {
        const quantityToDeduct = Number(item.quantity);

        await recordStockMovement(
          {
            businessId,
            productId: item.productId,
            type: StockMovementType.SALE_DISPATCH,
            quantity: -Math.abs(quantityToDeduct),
            referenceId: order.id,
            notes: `Dispatch for order ${order.orderNumber} (${order.isWalkIn ? order.walkInName || "Walk-in" : order.customer?.name})`,
            createdById: userId ?? null,
          },
          tx
        );
      }

      // 2. Post Task 5 Finance Transaction (INCOME)
      const incomeCategoryId = await getOrCreateSalesIncomeCategory(businessId, tx);
      const customerLabel = order.isWalkIn ? order.walkInName || "Walk-in Customer" : order.customer?.name || "Customer";

      const financialTx = await tx.financialTransaction.create({
        data: {
          businessId,
          categoryId: incomeCategoryId,
          orderId: order.id,
          type: TransactionType.INCOME,
          amount: order.totalAmount,
          paymentMethod,
          description: `Sales Revenue: ${order.orderNumber} - ${customerLabel}`,
          approvalStatus: ApprovalStatus.ACTIVE,
          transactionDate: order.orderDate,
          createdById: userId || (await tx.user.findFirstOrThrow({ where: { isActive: true } })).id,
        },
      });

      // 3. Mark Order as CONFIRMED & PAID
      const postedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          postedAt: new Date(),
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          transactions: true,
        },
      });

      await recordAuditEvent(
        {
          businessId,
          userId: userId ?? null,
          actionType: "SALES_ORDER_POSTED",
          targetEntity: "Order",
          targetId: order.id,
          changeDetails: {
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount.toString(),
            financialTransactionId: financialTx.id,
          },
        },
        tx
      );

      return postedOrder;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    }
  );
}

/**
 * Cancels a DRAFT sales order.
 * Cancelled draft leaves zero stock or financial side effects.
 */
export async function cancelOrderDraft(
  businessId: string,
  orderId: string,
  userId?: string
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, businessId },
  });

  if (!order) {
    throw new Error("Sales order not found or unauthorized.");
  }

  if (order.status !== OrderStatus.DRAFT) {
    throw new Error(`Cannot cancel an order in status "${order.status}". Only DRAFT orders can be cancelled.`);
  }

  return await prisma.$transaction(async (tx) => {
    const cancelled = await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "SALES_ORDER_CANCELLED",
        targetEntity: "Order",
        targetId: orderId,
        changeDetails: { orderNumber: order.orderNumber },
      },
      tx
    );

    return cancelled;
  });
}

/**
 * Records a customer return against a posted order:
 * - Replenishes stock atomically (CUSTOMER_RETURN).
 * - Records corresponding return in audit history.
 */
export async function recordCustomerReturn(
  businessId: string,
  input: CreateCustomerReturnInput,
  userId?: string
) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: input.orderId, businessId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!order) {
      throw new Error("Sales order not found or unauthorized.");
    }

    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.DELIVERED) {
      throw new Error("Returns can only be executed against posted/confirmed orders.");
    }

    let totalRefundAmount = new Prisma.Decimal(0);

    for (const item of input.items) {
      const originalItem = order.items.find((i) => i.productId === item.productId);
      if (!originalItem) {
        throw new Error(`Product ${item.productId} was not part of order ${order.orderNumber}.`);
      }

      // Record positive stock movement (returns goods back to inventory)
      await recordStockMovement(
        {
          businessId,
          productId: item.productId,
          type: StockMovementType.CUSTOMER_RETURN,
          quantity: Math.abs(item.quantity),
          referenceId: order.id,
          notes: `Customer return for ${order.orderNumber}: ${input.reason}`,
          createdById: userId ?? null,
        },
        tx
      );

      const unitPrice = item.unitAmount !== undefined ? new Prisma.Decimal(item.unitAmount) : originalItem.unitPrice;
      const lineRefund = unitPrice.mul(item.quantity);
      totalRefundAmount = totalRefundAmount.plus(lineRefund);
    }

    let refundTxId: string | null = null;
    if (totalRefundAmount.greaterThan(0)) {
      const refundCategoryId = await getOrCreateSalesRefundExpenseCategory(businessId, tx);
      const customerLabel = order.isWalkIn ? order.walkInName || "Walk-in Customer" : order.customer?.name || "Customer";

      const refundTx = await tx.financialTransaction.create({
        data: {
          businessId,
          categoryId: refundCategoryId,
          orderId: order.id,
          type: TransactionType.EXPENSE,
          amount: totalRefundAmount,
          paymentMethod: PaymentMethod.CASH,
          description: `Customer Refund: ${order.orderNumber} - ${customerLabel} (${input.reason})`,
          approvalStatus: ApprovalStatus.ACTIVE,
          transactionDate: new Date(),
          createdById: userId || (await tx.user.findFirstOrThrow({ where: { isActive: true } })).id,
        },
      });
      refundTxId = refundTx.id;
    }

    await recordAuditEvent(
      {
        businessId,
        userId: userId ?? null,
        actionType: "CUSTOMER_RETURN_RECORDED",
        targetEntity: "Order",
        targetId: order.id,
        changeDetails: {
          orderNumber: order.orderNumber,
          reason: input.reason,
          itemCount: input.items.length,
          refundAmount: totalRefundAmount.toString(),
          financialTransactionId: refundTxId,
        },
      },
      tx
    );

    return {
      success: true,
      orderId: order.id,
      refundAmount: totalRefundAmount.toNumber(),
      financialTransactionId: refundTxId,
    };
  });
}

/**
 * Retrieves paginated orders.
 */
export async function getOrders(
  businessId: string,
  options?: {
    customerId?: string;
    status?: OrderStatus;
    page?: number;
    limit?: number;
  }
) {
  const page = Math.max(options?.page ?? 1, 1);
  const limit = Math.max(options?.limit ?? 50, 1);
  const skip = (page - 1) * limit;

  const whereClause: Prisma.OrderWhereInput = {
    businessId,
    ...(options?.customerId ? { customerId: options.customerId } : {}),
    ...(options?.status ? { status: options.status } : {}),
  };

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unitOfMeasure: true },
            },
          },
        },
      },
      orderBy: { orderDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where: whereClause }),
  ]);

  return {
    orders,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
  };
}

/**
 * Retrieves single order details including printable invoice data.
 */
export async function getOrderById(businessId: string, orderId: string) {
  return await prisma.order.findFirst({
    where: { id: orderId, businessId },
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
      transactions: {
        include: { category: true },
      },
      business: {
        select: {
          id: true,
          name: true,
          settings: true,
        },
      },
    },
  });
}
