"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordHarvestAction } from "@/modules/mushroom/actions/mushroom.actions";
import { useLanguage } from "@/lib/i18n/language-context";
import { Sprout, X, Loader2 } from "lucide-react";

interface RecordHarvestModalProps {
  fruitingBatches: Array<{ id: string; batchCode: string; strainName: string }>;
  freshProducts: Array<{ id: string; name: string; sku: string }>;
}

export function RecordHarvestModal({ fruitingBatches, freshProducts }: RecordHarvestModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const router = useRouter();
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await recordHarvestAction(null, formData);
      if (!result.success) {
        setError(result.error || "Failed to record harvest flush.");
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
        <Sprout className="w-4 h-4" />
        <span>{t("mushroom.harvests.recordBtn", "Record Mushroom Flush")}</span>
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
              {t("mushroom.harvests.modalTitle", "Record Mushroom Flush")}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {t("mushroom.harvests.modalSubtitle", "Log fresh harvested mushrooms. Saleable yield (Grade A + B) will be atomically credited to fresh inventory.")}
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Batch */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t("mushroom.harvests.fruitingBatch", "Fruiting Batch *")}
                  </label>
                  <select
                    name="batchId"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {fruitingBatches.length > 0 ? (
                      fruitingBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchCode} ({b.strainName})
                        </option>
                      ))
                    ) : (
                      <option value="">{t("mushroom.harvests.noFruitingBatches", "No batches in FRUITING phase")}</option>
                    )}
                  </select>
                </div>

                {/* Fresh Product */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t("mushroom.harvests.freshProduct", "Fresh Mushroom Product *")}
                  </label>
                  <select
                    name="freshProductId"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {freshProducts.length > 0 ? (
                      freshProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))
                    ) : (
                      <option value="">{t("mushroom.harvests.noFreshProducts", "No FRESH_MUSHROOM products")}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {t("mushroom.harvests.flushNumber", "Flush # *")}
                  </label>
                  <input
                    type="number"
                    name="flushNumber"
                    min="1"
                    defaultValue="1"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {t("mushroom.harvests.totalFreshKg", "Total Fresh (kg) *")}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="totalFreshWeightKg"
                    required
                    placeholder="e.g. 25.500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {t("mushroom.harvests.gradeAKg", "Grade A (kg)")}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="gradeAWeightKg"
                    defaultValue="0.000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {t("mushroom.harvests.gradeBKg", "Grade B (kg)")}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="gradeBWeightKg"
                    defaultValue="0.000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t("mushroom.harvests.scrapKg", "Scrap / Trim Loss (kg)")}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="scrapWeightKg"
                    defaultValue="0.000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t("mushroom.harvests.harvestDate", "Harvest Date")}
                  </label>
                  <input
                    type="datetime-local"
                    name="harvestDate"
                    defaultValue={new Date().toISOString().slice(0, 16)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t("mushroom.harvests.observations", "Harvest Observations")}
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder={t("mushroom.harvests.observationsPlaceholder", "Notes on cap size, spore drop, pinhead density...")}
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
                  <span>{isPending ? t("common.saving", "Saving...") : t("mushroom.harvests.submitBtn", "Post Harvest Yield")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
