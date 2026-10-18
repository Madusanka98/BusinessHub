"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { executeDryingRunAction } from "@/modules/mushroom/actions/mushroom.actions";
import { useLanguage } from "@/lib/i18n/language-context";
import { Flame, X, Loader2 } from "lucide-react";

interface CreateDryingRunModalProps {
  freshProducts: Array<{ id: string; name: string; sku: string; currentStock: number }>;
  driedProducts: Array<{ id: string; name: string; sku: string }>;
  batches: Array<{ id: string; batchCode: string }>;
}

export function CreateDryingRunModal({
  freshProducts,
  driedProducts,
  batches,
}: CreateDryingRunModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  const [freshIn, setFreshIn] = useState<number>(10);
  const [driedOut, setDriedOut] = useState<number>(1);
  const router = useRouter();
  const { t } = useLanguage();

  const yieldRatio = freshIn > 0 ? ((driedOut / freshIn) * 100).toFixed(1) : "0.0";
  const moistureLoss = (100 - Number(yieldRatio)).toFixed(1);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await executeDryingRunAction(null, formData);
      if (!result.success) {
        setError(result.error || "Failed to process drying conversion.");
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/30 cursor-pointer"
      >
        <Flame className="w-4 h-4" />
        <span>{t("mushroom.drying.newRunBtn", "New Drying Run")}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">
              {t("mushroom.drying.modalTitle", "Execute Mushroom Drying Cycle")}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {t("mushroom.drying.subtitle", "Atomically deducts fresh stock from inventory, credits dried mushroom output, and transfers allocated unit valuation.")}
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Source Fresh Product */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t("mushroom.drying.freshInput", "Source Fresh Product *")}
                  </label>
                  <select
                    name="freshProductId"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {freshProducts.length > 0 ? (
                      freshProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.currentStock.toFixed(2)} kg available)
                        </option>
                      ))
                    ) : (
                      <option value="">No FRESH_MUSHROOM products</option>
                    )}
                  </select>
                </div>

                {/* Destination Dried Product */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t("mushroom.drying.driedOutput", "Destination Dried Product *")}
                  </label>
                  <select
                    name="driedProductId"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {driedProducts.length > 0 ? (
                      driedProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))
                    ) : (
                      <option value="">No DRIED_MUSHROOM products</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Optional Batch */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Traceability Batch (Optional)
                </label>
                <select
                  name="batchId"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">No specific batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchCode}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Fresh Weight In */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Fresh Weight Consumed (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="freshWeightInKg"
                    value={freshIn}
                    onChange={(e) => setFreshIn(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  {fieldErrors?.freshWeightInKg && (
                    <p className="text-[10px] text-rose-400 mt-0.5">{fieldErrors.freshWeightInKg[0]}</p>
                  )}
                </div>

                {/* Dried Weight Out */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Dried Output Produced (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="driedWeightOutKg"
                    value={driedOut}
                    onChange={(e) => setDriedOut(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  {fieldErrors?.driedWeightOutKg && (
                    <p className="text-[10px] text-rose-400 mt-0.5">{fieldErrors.driedWeightOutKg[0]}</p>
                  )}
                </div>
              </div>

              {/* Yield & Moisture Preview */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">{t("mushroom.drying.yieldRatio", "Drying Yield")}:</span>{" "}
                  <span className="font-bold text-emerald-400">{yieldRatio}%</span>
                </div>
                <div>
                  <span className="text-slate-400">{t("mushroom.drying.moistureLoss", "Moisture Loss")}:</span>{" "}
                  <span className="font-bold text-amber-400">{moistureLoss}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Loss / Crumbs */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t("mushroom.drying.lossKg", "Processing Loss (kg)")}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="lossWeightKg"
                    defaultValue="0.000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Loss Reason */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t("mushroom.drying.lossReason", "Loss Reason")}
                  </label>
                  <input
                    type="text"
                    name="lossReason"
                    placeholder="e.g. Broken caps, excessive shrinkage"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Dehydration Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Dehydrator model, 55°C for 14 hours, final target moisture 7%..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isPending ? t("common.saving", "Executing Conversion...") : t("mushroom.drying.modalTitle", "Complete Drying Cycle")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
