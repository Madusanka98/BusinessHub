import React from "react";
import Link from "next/link";
import { getTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import { MushroomNav } from "../mushroom-nav";
import { getDryingRuns } from "@/modules/mushroom/services/drying.service";
import { getProductionBatches } from "@/modules/mushroom/services/batch.service";
import { prisma } from "@/lib/db/prisma";
import { CreateDryingRunModal } from "./create-drying-run-modal";
import { Flame, Calendar, ArrowRight, Layers, Package } from "lucide-react";
import { ProductCategory } from "@prisma/client";

export default async function MushroomDryingPage() {
  const context = await getTenantContext();
  assertTenantPermission(context, "mushroom:drying:process");

  const businessId = context.businessId;
  const dryingRuns = await getDryingRuns(businessId);

  // Fetch FRESH_MUSHROOM and DRIED_MUSHROOM products
  const products = await prisma.product.findMany({
    where: {
      businessId,
      category: { in: [ProductCategory.FRESH_MUSHROOM, ProductCategory.DRIED_MUSHROOM] },
      isActive: true,
    },
    select: { id: true, name: true, sku: true, category: true, currentStock: true },
  });

  const freshProducts = products
    .filter((p) => p.category === ProductCategory.FRESH_MUSHROOM)
    .map((p) => ({ ...p, currentStock: Number(p.currentStock) }));

  const driedProducts = products.filter((p) => p.category === ProductCategory.DRIED_MUSHROOM);

  const batches = await getProductionBatches(businessId);

  // Aggregate metrics
  let totalFreshKg = 0;
  let totalDriedKg = 0;
  for (const run of dryingRuns) {
    totalFreshKg += Number(run.freshWeightInKg);
    totalDriedKg += Number(run.driedWeightOutKg);
  }
  const avgYield = totalFreshKg > 0 ? ((totalDriedKg / totalFreshKg) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-400" />
            <span>Mushroom Drying & Dehydration</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Convert fresh harvests into shelf-stable dried products with inventory conversion and cost allocation.
          </p>
        </div>

        <CreateDryingRunModal
          freshProducts={freshProducts}
          driedProducts={driedProducts}
          batches={batches.map((b) => ({ id: b.id, batchCode: b.batchCode }))}
        />
      </div>

      <MushroomNav />

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Total Fresh Consumed</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{totalFreshKg.toFixed(2)} kg</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Deducted from fresh inventory</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-amber-400 font-medium">Total Dried Produced</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{totalDriedKg.toFixed(2)} kg</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Added to dried inventory</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Average Drying Yield</span>
          <div className="text-xl font-bold text-white mt-1">{avgYield}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{dryingRuns.length} dehydration cycles completed</div>
        </div>
      </div>

      {/* Drying Runs Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        {dryingRuns.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No drying runs processed yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5 pl-5">Run Code</th>
                  <th className="p-3.5">Source Fresh Product</th>
                  <th className="p-3.5">Destination Dried Product</th>
                  <th className="p-3.5">Fresh In</th>
                  <th className="p-3.5">Dried Out</th>
                  <th className="p-3.5">Drying Yield</th>
                  <th className="p-3.5">Moisture Loss</th>
                  <th className="p-3.5">Batch</th>
                  <th className="p-3.5 pr-5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {dryingRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 pl-5 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>{run.runCode || "DRY"}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-200">
                      {run.freshProduct.name}
                    </td>
                    <td className="p-3.5 font-medium text-emerald-400">
                      {run.driedProduct.name}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-300">
                      {Number(run.freshWeightInKg).toFixed(2)} kg
                    </td>
                    <td className="p-3.5 font-bold text-amber-400">
                      {Number(run.driedWeightOutKg).toFixed(2)} kg
                    </td>
                    <td className="p-3.5 font-semibold text-white">
                      {Number(run.dryingYieldRatio || 0).toFixed(1)}%
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {Number(run.moistureLossPercentage).toFixed(1)}%
                    </td>
                    <td className="p-3.5">
                      {run.batch ? (
                        <Link
                          href={`/mushroom/batches/${run.batch.id}`}
                          className="hover:text-emerald-400 text-slate-300 transition-colors font-medium"
                        >
                          {run.batch.batchCode}
                        </Link>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-3.5 pr-5 text-slate-400">
                      {new Date(run.startedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
