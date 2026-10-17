"use client";

import React, { useState, useTransition } from "react";
import {
  createOrderAction,
  postOrderAction,
  cancelOrderAction,
  recordCustomerReturnAction,
} from "@/modules/commerce/actions/commerce.actions";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import {
  ShoppingCart,
  PlusCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Printer,
  X,
  Trash2,
  Plus,
  User,
  Users,
} from "lucide-react";

interface OrderItemRow {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  orderDate: Date | string;
  isWalkIn: boolean;
  walkInName?: string | null;
  subtotal: string | number | any;
  discountAmount: string | number | any;
  taxAmount: string | number | any;
  totalAmount: string | number | any;
  notes?: string | null;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  items: {
    id: string;
    productId: string;
    quantity: string | number | any;
    unitPrice: string | number | any;
    subtotal: string | number | any;
    product: {
      id: string;
      name: string;
      sku: string;
      unitOfMeasure: string;
    };
  }[];
}

interface CustomerOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  sellingPrice: string | number | any;
  currentStock: string | number | any;
  unitOfMeasure: string;
}

interface SalesTableProps {
  orders: SalesOrder[];
  customers: CustomerOption[];
  products: ProductOption[];
  canManage: boolean;
  businessName: string;
}

export function SalesTable({
  orders,
  customers,
  products,
  canManage,
  businessName,
}: SalesTableProps) {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<SalesOrder | null>(null);
  const [returnOrder, setReturnOrder] = useState<SalesOrder | null>(null);
  const [returnProductId, setReturnProductId] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState("");

  const [isWalkIn, setIsWalkIn] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<OrderItemRow[]>([
    { productId: products[0]?.id || "", quantity: 1, unitPrice: Number(products[0]?.sellingPrice || 0) },
  ]);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const calculateSubtotal = () => {
    return lines.reduce((acc, line) => acc + (line.quantity * line.unitPrice), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - discountAmount + taxAmount;
  };

  const handleProductChange = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    const updated = [...lines];
    updated[index] = {
      productId: prodId,
      quantity: updated[index].quantity,
      unitPrice: prod ? Number(prod.sellingPrice) : 0,
    };
    setLines(updated);
  };

  const handleLineChange = (index: number, field: "quantity" | "unitPrice", value: number) => {
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      [field]: Math.max(0, value),
    };
    setLines(updated);
  };

  const addLine = () => {
    setLines([
      ...lines,
      { productId: products[0]?.id || "", quantity: 1, unitPrice: Number(products[0]?.sellingPrice || 0) },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isWalkIn && !selectedCustomerId) {
      setErrorMsg("Please select a registered customer or enable walk-in customer.");
      return;
    }

    startTransition(async () => {
      const result = await createOrderAction({
        customerId: isWalkIn ? null : selectedCustomerId,
        isWalkIn,
        walkInName: isWalkIn ? walkInName || "Walk-in Customer" : null,
        orderDate,
        paymentMethod,
        discountAmount,
        taxAmount,
        notes,
        items: lines,
      });

      if (result.success) {
        setIsNewModalOpen(false);
      } else {
        setErrorMsg(result.error || "Failed to create sales order.");
      }
    });
  };

  const handlePost = (orderId: string) => {
    if (!confirm("Confirm and post this sale? Stock will be atomically validated and deducted, and revenue recorded in the ledger.")) {
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      const result = await postOrderAction(orderId);
      if (!result.success) {
        alert(result.error || "Failed to post order. Please check stock availability.");
      }
    });
  };

  const handleCancel = (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order draft?")) return;
    startTransition(async () => {
      await cancelOrderAction(orderId);
    });
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnOrder || !returnProductId) return;

    startTransition(async () => {
      const result = await recordCustomerReturnAction({
        orderId: returnOrder.id,
        reason: returnReason,
        items: [{ productId: returnProductId, quantity: returnQuantity, unitAmount: 0 }],
      });

      if (result.success) {
        setReturnOrder(null);
      } else {
        setErrorMsg(result.error || "Failed to process customer return.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-slate-400">
          Showing {orders.length} sales orders.
        </div>
        {canManage && (
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsNewModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Sales Order</span>
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold">
                <th className="py-3 px-4">SO Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Tax / Disc</th>
                <th className="py-3 px-4 text-right">Total (LKR)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No sales orders recorded.
                  </td>
                </tr>
              ) : (
                orders.map((so) => {
                  const isDraft = so.status === OrderStatus.DRAFT;
                  const isConfirmed = so.status === OrderStatus.CONFIRMED;

                  return (
                    <tr key={so.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {so.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {so.isWalkIn ? so.walkInName || "Walk-in Customer" : so.customer?.name}
                        </div>
                        {so.isWalkIn && (
                          <span className="text-[10px] text-slate-500">Walk-in</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {new Date(so.orderDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isDraft
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : isConfirmed
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-800 text-slate-500 border border-slate-700"
                          }`}
                        >
                          {so.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {Number(so.subtotal).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                        +{Number(so.taxAmount).toFixed(2)} / -{Number(so.discountAmount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {Number(so.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInvoiceOrder(so)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="View / Print Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {canManage && isDraft && (
                            <>
                              <button
                                onClick={() => handlePost(so.id)}
                                disabled={isPending}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                                title="Post order and deduct stock"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Post</span>
                              </button>
                              <button
                                onClick={() => handleCancel(so.id)}
                                disabled={isPending}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 text-[11px] transition-colors"
                                title="Cancel order draft"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {canManage && isConfirmed && (
                            <button
                              onClick={() => {
                                setErrorMsg(null);
                                setReturnOrder(so);
                                setReturnProductId(so.items[0]?.productId || "");
                                setReturnQuantity(1);
                                setReturnReason("");
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-950 text-indigo-400 text-[11px] font-medium border border-slate-700 transition-colors flex items-center gap-1"
                              title="Record customer return"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Return</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sales Order Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsNewModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              <span>Create Sales Order (Draft)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              A draft sale will not deduct inventory stock until verified and posted.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                <label className="flex items-center gap-2 text-white font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="customerType"
                    checked={!isWalkIn}
                    onChange={() => setIsWalkIn(false)}
                    className="text-emerald-500 focus:ring-0"
                  />
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Registered Customer</span>
                </label>

                <label className="flex items-center gap-2 text-white font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="customerType"
                    checked={isWalkIn}
                    onChange={() => setIsWalkIn(true)}
                    className="text-emerald-500 focus:ring-0"
                  />
                  <User className="w-4 h-4 text-sky-400" />
                  <span>Walk-in Customer</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {!isWalkIn ? (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Customer *
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      required={!isWalkIn}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select a customer...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Walk-in Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      placeholder="e.g. Cash Walk-in"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Order Date *
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {Object.values(PaymentMethod).map((pm) => (
                      <option key={pm} value={pm}>
                        {pm.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">Order Line Items</span>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {lines.map((line, idx) => {
                    const currentProd = products.find((p) => p.id === line.productId);
                    const lineSubtotal = line.quantity * line.unitPrice;
                    const availableStock = currentProd ? Number(currentProd.currentStock) : 0;
                    const isExceeding = line.quantity > availableStock;

                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center bg-slate-800/40 p-2.5 rounded-xl border border-slate-800"
                      >
                        <div className="col-span-5">
                          <select
                            value={line.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) — Stock: {Number(p.currentStock).toFixed(3)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                            className={`w-full bg-slate-800 border rounded-lg px-2 py-1.5 text-right font-mono ${
                              isExceeding
                                ? "border-amber-500 text-amber-400"
                                : "border-slate-700 text-white"
                            }`}
                            placeholder="Qty"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.unitPrice}
                            onChange={(e) => handleLineChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-right text-white font-mono"
                            placeholder="Price"
                          />
                        </div>
                        <div className="col-span-2 text-right font-mono font-semibold text-white">
                          LKR {lineSubtotal.toFixed(2)}
                        </div>
                        <div className="col-span-1 text-right">
                          {lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Adjustments: Discount & Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Discount Amount (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Tax Amount (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Summary Calculations */}
              <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 space-y-1 text-right font-mono">
                <div className="text-slate-400">
                  Subtotal: <span className="text-white">LKR {calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="text-slate-400">
                  Total Order Amount: <span className="text-emerald-400 font-bold text-sm">LKR {calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Customer Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional delivery instructions or customer notes"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-900/30 disabled:opacity-50"
                >
                  {isPending ? "Creating..." : "Save Sales Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice / Receipt Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setInvoiceOrder(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white print:hidden"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Printable Content Container */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-200">
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-4">
                <div>
                  <h1 className="text-xl font-extrabold text-white">{businessName}</h1>
                  <p className="text-xs text-slate-400">Official Sales Invoice / Receipt</p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {invoiceOrder.orderNumber}
                  </div>
                  <div className="text-xs text-slate-400">
                    Date: {new Date(invoiceOrder.orderDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Billed To */}
              <div className="mb-4 text-xs">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  Billed To
                </span>
                <div className="font-bold text-white text-sm">
                  {invoiceOrder.isWalkIn
                    ? invoiceOrder.walkInName || "Walk-in Customer"
                    : invoiceOrder.customer?.name}
                </div>
                {invoiceOrder.customer?.phone && (
                  <div className="text-slate-400">Phone: {invoiceOrder.customer.phone}</div>
                )}
                {invoiceOrder.customer?.address && (
                  <div className="text-slate-400">{invoiceOrder.customer.address}</div>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border-collapse mb-4">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono">
                  {invoiceOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 font-sans font-medium text-white">
                        {item.product.name}
                      </td>
                      <td className="py-2 text-right text-slate-300">
                        {Number(item.quantity).toFixed(3)} {item.product.unitOfMeasure}
                      </td>
                      <td className="py-2 text-right text-slate-300">
                        {Number(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="py-2 text-right font-bold text-white">
                        {Number(item.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculations */}
              <div className="border-t border-slate-800 pt-3 space-y-1 text-right text-xs font-mono">
                <div className="text-slate-400">
                  Subtotal: <span className="text-white">LKR {Number(invoiceOrder.subtotal).toFixed(2)}</span>
                </div>
                {Number(invoiceOrder.discountAmount) > 0 && (
                  <div className="text-slate-400">
                    Discount: <span className="text-rose-400">-LKR {Number(invoiceOrder.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoiceOrder.taxAmount) > 0 && (
                  <div className="text-slate-400">
                    Tax: <span className="text-white">+LKR {Number(invoiceOrder.taxAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="text-sm font-bold text-emerald-400 border-t border-slate-800 pt-1">
                  Total: LKR {Number(invoiceOrder.totalAmount).toFixed(2)}
                </div>
              </div>

              {invoiceOrder.notes && (
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                  <strong>Notes:</strong> {invoiceOrder.notes}
                </div>
              )}
            </div>

            {/* Print and Close Actions */}
            <div className="flex justify-end gap-2 pt-4 print:hidden">
              <button
                type="button"
                onClick={() => setInvoiceOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/30 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Return Modal */}
      {returnOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setReturnOrder(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-indigo-400" />
              <span>Customer Return ({returnOrder.orderNumber})</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Return goods back to stock from customer:{" "}
              <strong className="text-white">
                {returnOrder.isWalkIn ? returnOrder.walkInName || "Walk-in" : returnOrder.customer?.name}
              </strong>
              . Stock will be replenished atomically.
            </p>

            <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Product Item *
                </label>
                <select
                  value={returnProductId}
                  onChange={(e) => setReturnProductId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {returnOrder.items.map((item) => (
                    <option key={item.productId} value={item.productId}>
                      {item.product.name} (Sold: {Number(item.quantity).toFixed(3)} {item.product.unitOfMeasure})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Return Quantity *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Reason for Return *
                </label>
                <textarea
                  required
                  rows={2}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Excess purchase, packaging dissatisfaction, or canceled order"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReturnOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-900/30 disabled:opacity-50"
                >
                  {isPending ? "Processing..." : "Confirm Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
