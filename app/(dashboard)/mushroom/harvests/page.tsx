import React from "react";
import Link from "next/link";
import { getTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import { MushroomNav } from "../mushroom-nav";
import { getHarvestLogs } from "@/modules/mushroom/services/harvest.service";
import { getProductionBatches } from "@/modules/mushroom/services/batch.service";
import { prisma } from "@/lib/db/prisma";
import { RecordHarvestModal } from "./record-harvest-modal";
import { Sprout, Calendar, Layers, Package } from "lucide-react";
import { BatchPhase, ProductCategory } from "@prisma/client";

export default async function MushroomHarvestsPage() {
  const context = await getTenantContext();
  assertTenantPermission(context, "mushroom:harvest:log");

  const businessId = context.businessId;
  const harvests = await getHarvestLogs(businessId);

  // Fetch batches in FRUITING phase
  const fruitingBatches = await getProductionBatches(businessId, {
    phase: BatchPhase.FRUITING,
    status: "ACTIVE",
  });

  // Fetch FRESH_MUSHROOM products
  const freshProducts = await prisma.product.findMany({
    where: {
      businessId,
      category: ProductCategory.FRESH_MUSHROOM,
      isActive: true,
    },
    select: { id: true, name: true, sku: true },
  });

  // Aggregate totals
  let totalFreshKg = 0;
  let totalGradeAKg = 0;
  let totalGradeBKg = 0;
  let totalScrapKg = 0;

  for (const h of harvests) {
    totalFreshKg += Number(h.totalFreshWeightKg);
    totalGradeAKg += Number(h.gradeAWeightKg);
    totalGradeBKg += Number(h.gradeBWeightKg);
    totalScrapKg += Number(h.scrapWeightKg);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Harvest Operations</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track multi-flush mushroom yields and auto-post saleable fresh stock to inventory.
          </p>
        </div>

        <RecordHarvestModal
          fruitingBatches={fruitingBatches.map((b) => ({
            id: b.id,
            batchCode: b.batchCode,
            strainName: b.strain.name,
          }))}
          freshProducts={freshProducts}
        />
      </div>

      <MushroomNav />

      {/* Aggregate Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Total Harvested</span>
          <div className="text-xl font-bold text-white mt-1">{totalFreshKg.toFixed(2)} kg</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{harvests.length} flush logs</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-emerald-400 font-medium">Grade A (Premium)</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{totalGradeAKg.toFixed(2)} kg</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {totalFreshKg > 0 ? ((totalGradeAKg / totalFreshKg) * 100).toFixed(1) : 0}% of harvest
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-teal-400 font-medium">Grade B (Commercial)</span>
          <div className="text-xl font-bold text-teal-400 mt-1">{totalGradeBKg.toFixed(2)} kg</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {totalFreshKg > 0 ? ((totalGradeBKg / totalFreshKg) * 100).toFixed(1) : 0}% of harvest
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-rose-400 font-medium">Scrap / Trim Loss</span>
          <div className="text-xl font-bold text-rose-400 mt-1">{totalScrapKg.toFixed(2)} kg</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {totalFreshKg > 0 ? ((totalScrapKg / totalFreshKg) * 100).toFixed(1) : 0}% wastage
          </div>
        </div>
      </div>

      {/* Harvests Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        {harvests.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No harvest flushes recorded yet. Ensure an active batch is advanced to FRUITING phase.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5 pl-5">Harvest Code</th>
                  <th className="p-3.5">Batch Reference</th>
                  <th className="p-3.5">Flush #</th>
                  <th className="p-3.5">Fresh Yield</th>
                  <th className="p-3.5">Quality Split (A / B / Scrap)</th>
                  <th className="p-3.5">Credited Product</th>
                  <th className="p-3.5">Harvest Date</th>
                  <th className="p-3.5 pr-5">Harvester</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {harvests.map((h) => {
                  const saleable = Number(h.gradeAWeightKg) + Number(h.gradeBWeightKg);
                  return (
                    <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 pl-5 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{h.harvestCode || "HLV"}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <Link
                          href={`/mushroom/batches/${h.batch.id}`}
                          className="font-medium text-slate-200 hover:text-emerald-400 transition-colors"
                        >
                          {h.batch.batchCode}
                        </Link>
                        <div className="text-[11px] text-slate-500">{h.batch.strain.name}</div>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-200">Flush #{h.flushNumber}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-emerald-400">
                          {Number(h.totalFreshWeightKg).toFixed(2)} kg
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {saleable.toFixed(2)} kg saleable
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-300">
                          <span className="text-emerald-400">{Number(h.gradeAWeightKg).toFixed(2)}A</span> /{" "}
                          <span className="text-teal-400">{Number(h.gradeBWeightKg).toFixed(2)}B</span> /{" "}
                          <span className="text-rose-400">{Number(h.scrapWeightKg).toFixed(2)} scrap</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-200">{h.product.name}</div>
                        <div className="text-[10px] text-slate-500">SKU: {h.product.sku}</div>
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {new Date(h.harvestDate).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 pr-5 text-slate-400">
                        {h.harvester.fullName}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
