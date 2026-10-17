"use client";

import React, { useState, useTransition } from "react";
import {
  createPurchaseAction,
  postPurchaseAction,
  cancelPurchaseAction,
  recordSupplierReturnAction,
} from "@/modules/commerce/actions/commerce.actions";
import { PurchaseStatus, PaymentMethod } from "@prisma/client";
import {
  ShoppingBag,
  PlusCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  X,
  Trash2,
  Plus,
} from "lucide-react";

interface PurchaseItemRow {
  productId: string;
  quantity: number;
  unitCost: number;
}

interface PurchaseOrder {
  id: string;
  purchaseNumber: string;
  status: PurchaseStatus;
  paymentStatus: string;
  purchaseDate: Date | string;
  subtotal: string | number | { toString(): string };
  discountAmount: string | number | { toString(): string };
  taxAmount: string | number | { toString(): string };
  totalAmount: string | number | { toString(): string };
  notes?: string | null;
  supplier: {
    id: string;
    name: string;
  };
  items: {
    id: string;
    productId: string;
    quantity: string | number | { toString(): string };
    unitCost: string | number | { toString(): string };
    subtotal: string | number | { toString(): string };
    product: {
      id: string;
      name: string;
      sku: string;
      unitOfMeasure: string;
    };
  }[];
}

interface SupplierOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unitCost: string | number | { toString(): string };
  unitOfMeasure: string;
}

interface PurchaseTableProps {
  purchases: PurchaseOrder[];
  suppliers: SupplierOption[];
  products: ProductOption[];
  canManage: boolean;
}

export function PurchaseTable({
  purchases,
  suppliers,
  products,
  canManage,
}: PurchaseTableProps) {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [returnPurchase, setReturnPurchase] = useState<PurchaseOrder | null>(null);
  const [returnProductId, setReturnProductId] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState("");

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseItemRow[]>([
    { productId: products[0]?.id || "", quantity: 1, unitCost: Number(products[0]?.unitCost || 0) },
  ]);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const calculateSubtotal = () => {
    return lines.reduce((acc, line) => acc + (line.quantity * line.unitCost), 0);
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
      unitCost: prod ? Number(prod.unitCost) : 0,
    };
    setLines(updated);
  };

  const handleLineChange = (index: number, field: "quantity" | "unitCost", value: number) => {
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
      { productId: products[0]?.id || "", quantity: 1, unitCost: Number(products[0]?.unitCost || 0) },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedSupplierId) {
      setErrorMsg("Please select a supplier.");
      return;
    }

    startTransition(async () => {
      const result = await createPurchaseAction({
        supplierId: selectedSupplierId,
        purchaseDate,
        paymentMethod,
        discountAmount,
        taxAmount,
        notes,
        items: lines,
      });

      if (result.success) {
        setIsNewModalOpen(false);
      } else {
        setErrorMsg(result.error || "Failed to create purchase draft.");
      }
    });
  };

  const handlePost = (purchaseId: string) => {
    if (!confirm("Post this purchase? This will atomically receive inventory stock and record a financial expense.")) {
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      const result = await postPurchaseAction(purchaseId);
      if (!result.success) {
        alert(result.error || "Failed to post purchase.");
      }
    });
  };

  const handleCancel = (purchaseId: string) => {
    if (!confirm("Are you sure you want to cancel this purchase draft?")) return;
    startTransition(async () => {
      await cancelPurchaseAction(purchaseId);
    });
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnPurchase || !returnProductId) return;

    startTransition(async () => {
      const result = await recordSupplierReturnAction({
        purchaseId: returnPurchase.id,
        reason: returnReason,
        items: [{ productId: returnProductId, quantity: returnQuantity, unitAmount: 0 }],
      });

      if (result.success) {
        setReturnPurchase(null);
      } else {
        setErrorMsg(result.error || "Failed to process supplier return.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-slate-400">
          Showing {purchases.length} purchase orders.
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
            <span>New Purchase Order</span>
          </button>
        )}
      </div>

      {/* Purchases Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Tax / Disc</th>
                <th className="py-3 px-4 text-right">Total (LKR)</th>
                {canManage && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className="py-8 text-center text-slate-500">
                    No purchase orders recorded.
                  </td>
                </tr>
              ) : (
                purchases.map((po) => {
                  const isDraft = po.status === PurchaseStatus.DRAFT;
                  const isPosted = po.status === PurchaseStatus.POSTED;

                  return (
                    <tr key={po.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {po.purchaseNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {po.supplier.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {new Date(po.purchaseDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isDraft
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : isPosted
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-slate-800 text-slate-500 border border-slate-700"
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {Number(po.subtotal).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                        +{Number(po.taxAmount).toFixed(2)} / -{Number(po.discountAmount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {Number(po.totalAmount).toFixed(2)}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isDraft && (
                              <>
                                <button
                                  onClick={() => handlePost(po.id)}
                                  disabled={isPending}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                                  title="Post purchase and receive inventory"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Receive</span>
                                </button>
                                <button
                                  onClick={() => handleCancel(po.id)}
                                  disabled={isPending}
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 text-[11px] transition-colors"
                                  title="Cancel purchase draft"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {isPosted && (
                              <button
                                onClick={() => {
                                  setErrorMsg(null);
                                  setReturnPurchase(po);
                                  setReturnProductId(po.items[0]?.productId || "");
                                  setReturnQuantity(1);
                                  setReturnReason("");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-950 text-purple-400 text-[11px] font-medium border border-slate-700 transition-colors flex items-center gap-1"
                                title="Execute supplier return"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Return</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Order Modal */}
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
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              <span>Create Purchase Order (Draft)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              A draft purchase will not alter stock balances until posted and received.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Supplier *
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select a supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
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

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">Purchase Line Items</span>
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
                    const lineSubtotal = line.quantity * line.unitCost;
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
                                {p.name} ({p.sku})
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
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-right text-white font-mono"
                            placeholder="Qty"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.unitCost}
                            onChange={(e) => handleLineChange(idx, "unitCost", parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-right text-white font-mono"
                            placeholder="Cost"
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
                  Notes / References
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional supplier reference or invoice note"
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
                  {isPending ? "Creating..." : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Return Modal */}
      {returnPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setReturnPurchase(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-purple-400" />
              <span>Supplier Return ({returnPurchase.purchaseNumber})</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Return goods back to supplier: <strong className="text-white">{returnPurchase.supplier.name}</strong>. Stock will be atomically decreased.
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
                  {returnPurchase.items.map((item) => (
                    <option key={item.productId} value={item.productId}>
                      {item.product.name} (Purchased: {Number(item.quantity).toFixed(3)} {item.product.unitOfMeasure})
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
                  placeholder="e.g. Expired batch, defective bags, or damaged goods"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReturnPurchase(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md shadow-purple-900/30 disabled:opacity-50"
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
