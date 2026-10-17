"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProductionBatchAction } from "@/modules/mushroom/actions/mushroom.actions";
import { PlusCircle, X, Loader2 } from "lucide-react";

interface CreateBatchModalProps {
  strains: Array<{ id: string; name: string }>;
  recipes: Array<{ id: string; name: string; strainId: string }>;
  chambers: Array<{ id: string; name: string }>;
}

export function CreateBatchModal({ strains, recipes, chambers }: CreateBatchModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [selectedStrainId, setSelectedStrainId] = useState<string>(strains[0]?.id || "");
  const router = useRouter();

  const filteredRecipes = recipes.filter((r) => r.strainId === selectedStrainId);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createProductionBatchAction(null, formData);
      if (!result.success) {
        setError(result.error || "Failed to initialize production batch.");
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
        <PlusCircle className="w-4 h-4" />
        <span>Initialize Batch</span>
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

            <h2 className="text-lg font-bold text-white mb-1">Initialize Production Batch</h2>
            <p className="text-xs text-slate-400 mb-4">
              Begin a new biological cultivation cycle with controlled bag group tracking.
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Strain */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mushroom Strain *</label>
                  <select
                    name="strainId"
                    value={selectedStrainId}
                    onChange={(e) => setSelectedStrainId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {strains.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Substrate Recipe */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Substrate Recipe *</label>
                  <select
                    name="recipeId"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {filteredRecipes.length > 0 ? (
                      filteredRecipes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))
                    ) : (
                      <option value="">No recipe for strain</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Initial Bags Count */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Initial Bags Count *</label>
                  <input
                    type="number"
                    name="initialBagsCount"
                    min="1"
                    defaultValue="500"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  {fieldErrors?.initialBagsCount && (
                    <p className="text-[10px] text-rose-400 mt-0.5">{fieldErrors.initialBagsCount[0]}</p>
                  )}
                </div>

                {/* Fruiting Chamber (Optional) */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Chamber</label>
                  <select
                    name="chamberId"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">None (Assign during fruiting)</option>
                    {chambers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Expected Yield */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Expected Yield (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    name="expectedYieldKg"
                    defaultValue="100.000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Allocated Cost */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Allocated Cost (LKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="allocatedCost"
                    defaultValue="0.00"
                    placeholder="0.00 (auto-calc if 0)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Production Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Optional batch preparation notes, grain spawn lot reference, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isPending ? "Initializing..." : "Create Batch"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
