import React from "react";
import Link from "next/link";
import { getTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import { MushroomNav } from "../mushroom-nav";
import { getProductionBatches } from "@/modules/mushroom/services/batch.service";
import {
  getMushroomStrains,
  getSubstrateRecipes,
  getFruitingChambers,
} from "@/modules/mushroom/services/strain.service";
import { CreateBatchModal } from "./create-batch-modal";
import { Layers, Calendar, ArrowRight } from "lucide-react";
import { BatchPhase, BatchStatus } from "@prisma/client";

interface BatchesPageProps {
  searchParams: Promise<{
    phase?: string;
    status?: string;
  }>;
}

export default async function MushroomBatchesPage({ searchParams }: BatchesPageProps) {
  const context = await getTenantContext();
  assertTenantPermission(context, "mushroom:batches:view");

  const businessId = context.businessId;
  const params = await searchParams;

  const batches = await getProductionBatches(businessId, {
    phase: params.phase ? (params.phase as BatchPhase) : undefined,
    status: params.status ? (params.status as BatchStatus) : undefined,
  });

  const strains = await getMushroomStrains(businessId);
  const recipes = await getSubstrateRecipes(businessId);
  const chambers = await getFruitingChambers(businessId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Production Batches</h1>
          <p className="text-sm text-slate-400 mt-1">
            Controlled bag-group production cycles from substrate preparation through harvest.
          </p>
        </div>

        <CreateBatchModal
          strains={strains.map((s) => ({ id: s.id, name: s.name }))}
          recipes={recipes.map((r) => ({ id: r.id, name: r.name, strainId: r.strainId }))}
          chambers={chambers.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>

      <MushroomNav />

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <Link
          href="/mushroom/batches"
          className={`px-3 py-1.5 rounded-lg border font-medium ${
            !params.phase && !params.status
              ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          All Batches
        </Link>
        {["PREPARATION", "STERILIZATION", "INOCULATION", "INCUBATION", "FRUITING", "COMPLETED"].map((p) => (
          <Link
            key={p}
            href={`/mushroom/batches?phase=${p}`}
            className={`px-3 py-1.5 rounded-lg border font-medium ${
              params.phase === p
                ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            {p}
          </Link>
        ))}
      </div>

      {/* Batches Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        {batches.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No production batches found matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5 pl-5">Batch Code</th>
                  <th className="p-3.5">Strain / Recipe</th>
                  <th className="p-3.5">Current Phase</th>
                  <th className="p-3.5">Bags (Viable / Initial)</th>
                  <th className="p-3.5">Chamber</th>
                  <th className="p-3.5">Start Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {batches.map((batch) => {
                  const lossCount = batch.initialBagsCount - batch.viableBagsCount;
                  const survivalRate =
                    batch.initialBagsCount > 0
                      ? ((batch.viableBagsCount / batch.initialBagsCount) * 100).toFixed(0)
                      : "100";

                  return (
                    <tr key={batch.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 pl-5 font-semibold text-white">
                        <Link
                          href={`/mushroom/batches/${batch.id}`}
                          className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Layers className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{batch.batchCode}</span>
                        </Link>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-200">{batch.strain.name}</div>
                        <div className="text-[11px] text-slate-500">{batch.recipe.name}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {batch.currentPhase}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white">
                          {batch.viableBagsCount} / {batch.initialBagsCount}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {survivalRate}% viable ({lossCount} lost)
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {batch.chamber ? batch.chamber.name : <span className="text-slate-600">Unassigned</span>}
                      </td>
                      <td className="p-3.5 text-slate-400">
                        <div className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{new Date(batch.startDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            batch.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : batch.status === "COMPLETED"
                              ? "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {batch.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <Link
                          href={`/mushroom/batches/${batch.id}`}
                          className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
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
