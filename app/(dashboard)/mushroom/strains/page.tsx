import React from "react";
import { getTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import { MushroomNav } from "../mushroom-nav";
import {
  getMushroomStrains,
  getSubstrateRecipes,
  getFruitingChambers,
} from "@/modules/mushroom/services/strain.service";
import { prisma } from "@/lib/db/prisma";
import { CreateStrainModal } from "./create-strain-modal";
import { CreateRecipeModal } from "./create-recipe-modal";
import { CreateChamberModal } from "./create-chamber-modal";
import { Dna, BookOpen, Warehouse, Layers } from "lucide-react";
import { ProductCategory } from "@prisma/client";

export default async function MushroomStrainsPage() {
  const context = await getTenantContext();
  assertTenantPermission(context, "mushroom:recipes:view");

  const businessId = context.businessId;
  const strains = await getMushroomStrains(businessId);
  const recipes = await getSubstrateRecipes(businessId);
  const chambers = await getFruitingChambers(businessId);

  // Fetch RAW_MATERIAL products for recipes
  const rawMaterials = await prisma.product.findMany({
    where: {
      businessId,
      category: ProductCategory.RAW_MATERIAL,
      isActive: true,
    },
    select: { id: true, name: true, sku: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Dna className="w-6 h-6 text-emerald-400" />
            <span>Mushroom Strains & Substrate Recipes</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure biological strain profiles, substrate formulas, and fruiting chamber parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CreateStrainModal />
          <CreateRecipeModal
            strains={strains.map((s) => ({ id: s.id, name: s.name }))}
            rawMaterials={rawMaterials}
          />
          <CreateChamberModal />
        </div>
      </div>

      <MushroomNav />

      {/* Grid: Strains & Chambers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strains List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Dna className="w-4 h-4 text-emerald-400" />
              <span>Registered Mushroom Strains ({strains.length})</span>
            </h2>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            {strains.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No mushroom strains registered yet. Add your first strain!
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 pl-5">Strain Name</th>
                    <th className="p-3.5">Scientific Name</th>
                    <th className="p-3.5">Incubation</th>
                    <th className="p-3.5">Fruiting</th>
                    <th className="p-3.5">Temp / Humidity</th>
                    <th className="p-3.5 pr-5 text-right">Batches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {strains.map((strain) => (
                    <tr key={strain.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 pl-5 font-semibold text-white">
                        {strain.name}
                      </td>
                      <td className="p-3.5 text-slate-400 italic">
                        {strain.scientificName || "—"}
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {strain.incubationDays} days
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {strain.fruitingDays} days
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {strain.optimalTempRange || "Any"} • {strain.optimalHumidity || "Any"}
                      </td>
                      <td className="p-3.5 pr-5 text-right font-medium text-emerald-400">
                        {strain._count.batches}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Chambers List (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-emerald-400" />
              <span>Fruiting Chambers ({chambers.length})</span>
            </h2>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            {chambers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No chambers configured. Add a fruiting room or tent.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {chambers.map((chamber) => (
                  <div key={chamber.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{chamber.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Capacity: {chamber.capacityBags.toLocaleString()} bags
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {chamber.batches.length} active batches
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Substrate Recipes List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>Substrate Recipes & Formulas ({recipes.length})</span>
        </h2>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
          {recipes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No substrate recipes defined yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5 pl-5">Recipe Name</th>
                  <th className="p-3.5">Strain</th>
                  <th className="p-3.5">Bag Weight</th>
                  <th className="p-3.5">Ingredients Breakdown</th>
                  <th className="p-3.5">Instructions</th>
                  <th className="p-3.5 pr-5 text-right">Batches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {recipes.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 pl-5 font-semibold text-white">
                      {r.name}
                    </td>
                    <td className="p-3.5 font-medium text-emerald-400">
                      {r.strain.name}
                    </td>
                    <td className="p-3.5 text-slate-300">
                      {Number(r.standardBagWeightKg)} kg
                    </td>
                    <td className="p-3.5">
                      {r.ingredients.length === 0 ? (
                        <span className="text-slate-500 italic">None linked</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.ingredients.map((ing) => (
                            <span
                              key={ing.id}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                            >
                              {ing.rawMaterial.name} ({Number(ing.percentage)}%)
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400 max-w-xs truncate">
                      {r.instructions || "—"}
                    </td>
                    <td className="p-3.5 pr-5 text-right font-medium text-emerald-400">
                      {r._count.batches}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
