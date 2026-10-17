"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSubstrateRecipeAction } from "@/modules/mushroom/actions/mushroom.actions";
import { PlusCircle, X, Loader2, Plus, Trash2 } from "lucide-react";

interface CreateRecipeModalProps {
  strains: Array<{ id: string; name: string }>;
  rawMaterials: Array<{ id: string; name: string; sku: string }>;
}

export function CreateRecipeModal({ strains, rawMaterials }: CreateRecipeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [ingredients, setIngredients] = useState<
    Array<{ rawMaterialProductId: string; percentage: number; quantityPerBag: number }>
  >([]);

  const addIngredient = () => {
    if (rawMaterials.length > 0) {
      setIngredients([
        ...ingredients,
        { rawMaterialProductId: rawMaterials[0].id, percentage: 50, quantityPerBag: 0.5 },
      ]);
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: string, val: string | number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: val };
    setIngredients(updated);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("ingredientsJson", JSON.stringify(ingredients));

    startTransition(async () => {
      const result = await createSubstrateRecipeAction(null, formData);
      if (!result.success) {
        setError(result.error || "Failed to create substrate recipe.");
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-900/30 cursor-pointer"
      >
        <PlusCircle className="w-3.5 h-3.5" />
        <span>Add Recipe</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1">New Substrate Recipe</h2>
            <p className="text-xs text-slate-400 mb-4">
              Define the raw material formulation and standard bag specifications.
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Strain *</label>
                  <select
                    name="strainId"
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
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Recipe Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Master Sawdust Mix"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Standard Bag Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.1"
                  name="standardBagWeightKg"
                  defaultValue="1.000"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Recipe Ingredients */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-300">Raw Material Ingredients</span>
                  {rawMaterials.length > 0 && (
                    <button
                      type="button"
                      onClick={addIngredient}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Raw Material
                    </button>
                  )}
                </div>

                {ingredients.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                    No individual raw material items specified. You can link them anytime for automated inventory deduction.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800"
                      >
                        <select
                          value={ing.rawMaterialProductId}
                          onChange={(e) => updateIngredient(idx, "rawMaterialProductId", e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white flex-1 focus:outline-none"
                        >
                          {rawMaterials.map((rm) => (
                            <option key={rm.id} value={rm.id}>
                              {rm.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="%"
                          value={ing.percentage}
                          onChange={(e) => updateIngredient(idx, "percentage", parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white text-right"
                        />
                        <span className="text-[10px] text-slate-400">%</span>
                        <input
                          type="number"
                          step="0.001"
                          placeholder="kg/bag"
                          value={ing.quantityPerBag}
                          onChange={(e) => updateIngredient(idx, "quantityPerBag", parseFloat(e.target.value) || 0)}
                          className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white text-right"
                        />
                        <span className="text-[10px] text-slate-400">kg</span>
                        <button
                          type="button"
                          onClick={() => removeIngredient(idx)}
                          className="text-slate-400 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mixing & Sterilization Instructions</label>
                <textarea
                  name="instructions"
                  rows={2}
                  placeholder="Moisture target 60-65%, autoclave 121°C for 2.5 hours..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Recipe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
