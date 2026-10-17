"use client";

import React, { useState, useTransition } from "react";
import { adjustStockAction } from "@/modules/commerce/actions/commerce.actions";
import { StockMovementType } from "@prisma/client";
import {
  ArrowLeftRight,
  Filter,
  PlusCircle,
  X,
  AlertTriangle,
} from "lucide-react";

interface MovementItem {
  id: string;
  type: StockMovementType;
  quantity: string | number | { toString(): string };
  balanceAfter: string | number | { toString(): string };
  referenceId?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  product: {
    id: string;
    sku: string;
    name: string;
    unitOfMeasure: string;
  };
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  currentStock: string | number | { toString(): string };
  unitOfMeasure: string;
}

interface MovementTableProps {
  movements: MovementItem[];
  products: ProductOption[];
  canAdjust: boolean;
}

export function MovementTable({
  movements,
  products,
  canAdjust,
}: MovementTableProps) {
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredMovements = movements.filter((m) => {
    return selectedType === "ALL" || m.type === selectedType;
  });

  const handleAdjustSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await adjustStockAction(null, formData);
      if (result.success) {
        setIsAdjustModalOpen(false);
      } else {
        setErrorMsg(result.error || "Failed to adjust stock.");
      }
    });
  };

  const getTypeBadge = (type: StockMovementType) => {
    switch (type) {
      case StockMovementType.OPENING_STOCK:
        return "bg-slate-800 text-slate-300 border-slate-700";
      case StockMovementType.PURCHASE_RECEIPT:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case StockMovementType.SALE_DISPATCH:
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case StockMovementType.CUSTOMER_RETURN:
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case StockMovementType.SUPPLIER_RETURN:
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case StockMovementType.ADJUSTMENT_ADD:
        return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      case StockMovementType.ADJUSTMENT_SCRAP:
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case StockMovementType.ADJUSTMENT_AUDIT:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Adjustment Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Movement Types</option>
              {Object.values(StockMovementType).map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canAdjust && (
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsAdjustModalOpen(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-900/30 transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Authorized Stock Adjustment</span>
          </button>
        )}
      </div>

      {/* Movements Ledger Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4 text-right">Quantity Delta</th>
                <th className="py-3 px-4 text-right">Balance After</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Notes / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No stock movements recorded.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const qty = Number(m.quantity);
                  const isPositive = qty > 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{m.product.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {m.product.sku}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${getTypeBadge(
                            m.type
                          )}`}
                        >
                          {m.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                          {isPositive ? `+${qty.toFixed(3)}` : qty.toFixed(3)}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">
                          {m.product.unitOfMeasure}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white font-semibold">
                        {Number(m.balanceAfter).toFixed(3)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {m.referenceId || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {m.notes || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Authorized Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAdjustModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-amber-400" />
              <span>Record Stock Adjustment</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              All stock changes are immutable and recorded in the audit trail. Direct balance edits are prohibited.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Product Item *
                </label>
                <select
                  name="productId"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select a product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Available: {Number(p.currentStock).toFixed(3)} {p.unitOfMeasure}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Adjustment Type *
                </label>
                <select
                  name="type"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={StockMovementType.ADJUSTMENT_ADD}>
                    Add Stock (Found inventory / Unrecorded influx)
                  </option>
                  <option value={StockMovementType.ADJUSTMENT_SCRAP}>
                    Scrap / Damage (Spoilage, contamination, discarded)
                  </option>
                  <option value={StockMovementType.ADJUSTMENT_AUDIT}>
                    Audit Reconciliation (Physical count correction)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Adjustment Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  step="0.001"
                  required
                  placeholder="e.g. 5.000 or -2.000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <span className="block text-[10px] text-slate-500 mt-1">
                  For scrap/damage, enter positive quantity (it will automatically deduct).
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Reason & Audit Notes *
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  required
                  placeholder="Mandatory reason for audit reconciliation (e.g. Mold contamination discovered during routine chamber check)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-md shadow-amber-900/30 disabled:opacity-50"
                >
                  {isPending ? "Recording..." : "Commit Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
