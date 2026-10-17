import React from "react";
import Link from "next/link";
import { getTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import { MushroomNav } from "./mushroom-nav";
import { getProductionMetrics } from "@/modules/mushroom/services/production-metrics.service";
import { getProductionBatches } from "@/modules/mushroom/services/batch.service";
import { getHarvestLogs } from "@/modules/mushroom/services/harvest.service";
import {
  Layers,
  Sprout,
  Package,
  Flame,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Clock,
  Sparkles,
} from "lucide-react";

export default async function MushroomDashboardPage() {
  const context = await getTenantContext();
  assertTenantPermission(context, "mushroom:batches:view");

  const businessId = context.businessId;
  const metrics = await getProductionMetrics(businessId);
  const recentBatches = await getProductionBatches(businessId);
  const recentHarvests = await getHarvestLogs(businessId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Mushroom Cultivation Hub</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-3 h-3" />
              Specialized Production
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time batch tracking, fruiting flushes, drying conversions, and inventory integration.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/mushroom/batches"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Manage Batches</span>
          </Link>
          <Link
            href="/mushroom/harvests"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700"
          >
            <Sprout className="w-4 h-4" />
            <span>Record Harvest</span>
          </Link>
        </div>
      </div>

      <MushroomNav />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Batches */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Batches</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {metrics.batches.active}{" "}
              <span className="text-xs font-normal text-slate-500">/ {metrics.batches.total} total</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {metrics.batches.totalActiveViableBags.toLocaleString()} viable bags in farm
            </div>
          </div>
        </div>

        {/* Total Fresh Harvested */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Fresh Harvest Yield</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Sprout className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {metrics.harvest.totalSaleableKg.toFixed(2)}{" "}
              <span className="text-xs font-normal text-slate-500">kg saleable</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Avg yield: {metrics.harvest.averageYieldPerBag.toFixed(3)} kg / bag
            </div>
          </div>
        </div>

        {/* Fresh vs Dried Inventory */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Inventory Stock</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-3">
              <div>
                <span className="text-lg font-bold text-emerald-400">{metrics.inventory.freshStockAvailableKg}</span>
                <span className="text-[11px] text-slate-400 ml-1">kg Fresh</span>
              </div>
              <div className="border-l border-slate-800 pl-3">
                <span className="text-lg font-bold text-amber-400">{metrics.inventory.driedStockAvailableKg}</span>
                <span className="text-[11px] text-slate-400 ml-1">kg Dried</span>
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Integrated with Task 6 Commerce Engine
            </div>
          </div>
        </div>

        {/* Loss & Contamination */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Contamination & Loss</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {metrics.batches.bagLossRate}%{" "}
              <span className="text-xs font-normal text-slate-500">loss rate</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {metrics.batches.totalDiscardedBags} discarded bags logged
            </div>
          </div>
        </div>
      </div>

      {/* Production Lifecycle Pipeline */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">Active Lifecycle Pipeline</h2>
          <span className="text-xs text-slate-500">Controlled stage transition progression</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { phase: "PREPARATION", label: "Preparation", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            { phase: "STERILIZATION", label: "Sterilization", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
            { phase: "INOCULATION", label: "Inoculation", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
            { phase: "INCUBATION", label: "Incubation", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
            { phase: "FRUITING", label: "Fruiting", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
            { phase: "COMPLETED", label: "Completed", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
          ].map((item) => {
            const count = metrics.batches.byPhase[item.phase] || 0;
            return (
              <div key={item.phase} className={`p-3 rounded-xl border ${item.color}`}>
                <div className="text-[11px] font-medium opacity-80">{item.label}</div>
                <div className="text-xl font-bold mt-1 text-white">{count}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">batches</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Column Grid: Recent Batches & Recent Harvests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Batches */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-200">Recent Batches</h2>
              <Link
                href="/mushroom/batches"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentBatches.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No production batches recorded yet. Initialize your first batch!
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {recentBatches.slice(0, 5).map((batch) => (
                  <div key={batch.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <Link
                        href={`/mushroom/batches/${batch.id}`}
                        className="text-xs font-semibold text-white hover:text-emerald-400 transition-colors"
                      >
                        {batch.batchCode}
                      </Link>
                      <div className="text-[11px] text-slate-400">
                        {batch.strain.name} • {batch.viableBagsCount} / {batch.initialBagsCount} bags
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {batch.currentPhase}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {batch.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Harvests */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-200">Recent Flushes Harvested</h2>
              <Link
                href="/mushroom/harvests"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentHarvests.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No harvest flushes recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {recentHarvests.slice(0, 5).map((harvest) => (
                  <div key={harvest.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {harvest.harvestCode || "Harvest"} (Flush #{harvest.flushNumber})
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Batch {harvest.batch.batchCode} • {harvest.product.name}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400">
                        +{Number(harvest.totalFreshWeightKg).toFixed(2)} kg
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {harvest.harvester.fullName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
