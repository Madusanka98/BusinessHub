import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import { MushroomNav } from "../../mushroom-nav";
import { getProductionBatchById } from "@/modules/mushroom/services/batch.service";
import { getFruitingChambers } from "@/modules/mushroom/services/strain.service";
import { BatchActions } from "./batch-actions";
import {
  Layers,
  ArrowLeft,
  Calendar,
  Sprout,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Thermometer,
  Droplets,
  Wind,
} from "lucide-react";

interface BatchDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MushroomBatchDetailPage({ params }: BatchDetailPageProps) {
  const context = await getTenantContext();
  assertTenantPermission(context, "mushroom:batches:view");

  const businessId = context.businessId;
  const { id } = await params;

  const batch = await getProductionBatchById(businessId, id);
  if (!batch) {
    notFound();
  }

  const chambers = await getFruitingChambers(businessId);

  // Harvest calculations for this batch
  let totalHarvestedKg = 0;
  let totalGradeAKg = 0;
  let totalGradeBKg = 0;
  let totalScrapKg = 0;

  for (const h of batch.harvestLogs) {
    totalHarvestedKg += Number(h.totalFreshWeightKg);
    totalGradeAKg += Number(h.gradeAWeightKg);
    totalGradeBKg += Number(h.gradeBWeightKg);
    totalScrapKg += Number(h.scrapWeightKg);
  }

  const totalSaleableKg = totalGradeAKg + totalGradeBKg;
  const expectedYield = Number(batch.expectedYieldKg || 0);
  const yieldVariance = totalSaleableKg - expectedYield;
  const yieldPerBag =
    batch.initialBagsCount > 0 ? (totalSaleableKg / batch.initialBagsCount).toFixed(3) : "0.000";

  const totalLostBags = batch.initialBagsCount - batch.viableBagsCount;
  const survivalRate =
    batch.initialBagsCount > 0
      ? ((batch.viableBagsCount / batch.initialBagsCount) * 100).toFixed(1)
      : "100.0";

  const allocatedCost = Number(batch.allocatedCost || 0);
  const costPerSaleableKg =
    totalSaleableKg > 0 ? (allocatedCost / totalSaleableKg).toFixed(2) : "N/A";

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          href="/mushroom/batches"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Batches</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <Layers className="w-6 h-6 text-emerald-400" />
                <span>{batch.batchCode}</span>
              </h1>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Phase: {batch.currentPhase}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  batch.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : batch.status === "COMPLETED"
                    ? "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {batch.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {batch.strain.name} ({batch.strain.scientificName || "Commercial strain"}) • Recipe:{" "}
              {batch.recipe.name}
            </p>
          </div>

          <BatchActions
            batchId={batch.id}
            currentPhase={batch.currentPhase}
            viableBagsCount={batch.viableBagsCount}
            status={batch.status}
            chambers={chambers.map((c) => ({ id: c.id, name: c.name }))}
          />
        </div>
      </div>

      <MushroomNav />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bag Counts */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Bag Group Status</span>
          <div className="text-2xl font-bold text-white mt-1">
            {batch.viableBagsCount}{" "}
            <span className="text-xs font-normal text-slate-500">/ {batch.initialBagsCount} bags</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {survivalRate}% survival • {totalLostBags} lost/discarded
          </div>
        </div>

        {/* Harvest Yield */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Harvest Yield</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {totalSaleableKg.toFixed(2)}{" "}
            <span className="text-xs font-normal text-slate-500">kg saleable</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {yieldPerBag} kg/bag • {batch.harvestLogs.length} flushes recorded
          </div>
        </div>

        {/* Yield Variance */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Expected vs Actual</span>
          <div className="text-2xl font-bold text-white mt-1">
            {expectedYield.toFixed(2)}{" "}
            <span className="text-xs font-normal text-slate-500">kg expected</span>
          </div>
          <div className="text-xs mt-1">
            <span className={yieldVariance >= 0 ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
              {yieldVariance >= 0 ? `+${yieldVariance.toFixed(2)}` : yieldVariance.toFixed(2)} kg
            </span>{" "}
            <span className="text-slate-500">variance</span>
          </div>
        </div>

        {/* Cost Allocation */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Batch Costing</span>
          <div className="text-2xl font-bold text-white mt-1">
            LKR {allocatedCost.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Cost/kg: {costPerSaleableKg !== "N/A" ? `LKR ${costPerSaleableKg}` : "Awaiting harvest"}
          </div>
        </div>
      </div>

      {/* Substrate Recipe & Production Parameters */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Substrate Composition & Traceability</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Strain</span>
              <span className="font-semibold text-white">{batch.strain.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Standard Bag Weight</span>
              <span className="text-slate-200">{Number(batch.recipe.standardBagWeightKg)} kg</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Assigned Chamber</span>
              <span className="text-slate-200">{batch.chamber ? batch.chamber.name : "Unassigned"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Initiator</span>
              <span className="text-slate-200">{batch.initiator.fullName} ({batch.initiator.email})</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-slate-400 block mb-2">Recipe Raw Materials:</span>
            {batch.recipe.ingredients.length === 0 ? (
              <p className="text-xs text-slate-500">No specific raw material breakdown configured.</p>
            ) : (
              <div className="space-y-1.5">
                {batch.recipe.ingredients.map((ing) => (
                  <div
                    key={ing.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs"
                  >
                    <span className="font-medium text-slate-300">{ing.rawMaterial.name}</span>
                    <span className="text-slate-400">
                      {Number(ing.percentage)}% ({Number(ing.quantityPerBag)} kg/bag)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Environmental Phase History Timeline */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Phase Transitions & Environmental Log</h2>
        {batch.phaseLogs.length === 0 ? (
          <p className="text-xs text-slate-500">No phase logs recorded.</p>
        ) : (
          <div className="space-y-3">
            {batch.phaseLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-400">{log.phase}</span>
                    <span className="text-slate-500 text-[11px]">
                      {new Date(log.loggedAt).toLocaleString()}
                    </span>
                  </div>
                  {log.notes && <p className="text-slate-400 mt-1">{log.notes}</p>}
                </div>

                <div className="flex items-center gap-4 text-slate-300 text-xs">
                  {log.temperature && (
                    <div className="flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                      <span>{Number(log.temperature)}°C</span>
                    </div>
                  )}
                  {log.humidity && (
                    <div className="flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-blue-400" />
                      <span>{Number(log.humidity)}%</span>
                    </div>
                  )}
                  {log.co2Ppm && (
                    <div className="flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{log.co2Ppm} ppm</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Harvests Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Harvest Records</h2>
          <Link
            href="/mushroom/harvests"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Go to Harvest Operations &rarr;
          </Link>
        </div>

        {batch.harvestLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No harvests recorded for this batch yet.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3 pl-5">Code / Flush</th>
                <th className="p-3">Total Fresh</th>
                <th className="p-3">Grade A</th>
                <th className="p-3">Grade B</th>
                <th className="p-3">Scrap</th>
                <th className="p-3">Inventory Product</th>
                <th className="p-3 pr-5">Harvester</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {batch.harvestLogs.map((h) => (
                <tr key={h.id}>
                  <td className="p-3 pl-5 font-semibold text-white">
                    {h.harvestCode || "HLV"} (Flush #{h.flushNumber})
                  </td>
                  <td className="p-3 font-bold text-emerald-400">
                    {Number(h.totalFreshWeightKg).toFixed(2)} kg
                  </td>
                  <td className="p-3">{Number(h.gradeAWeightKg).toFixed(2)} kg</td>
                  <td className="p-3">{Number(h.gradeBWeightKg).toFixed(2)} kg</td>
                  <td className="p-3 text-rose-400">{Number(h.scrapWeightKg).toFixed(2)} kg</td>
                  <td className="p-3 text-slate-300">{h.product.name}</td>
                  <td className="p-3 pr-5 text-slate-400">{h.harvester.fullName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Contamination Logs */}
      {batch.contaminationLogs.length > 0 && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Contamination & Discard History</span>
            </h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3 pl-5">Date</th>
                <th className="p-3">Phase Detected</th>
                <th className="p-3">Discarded Bags</th>
                <th className="p-3">Reason</th>
                <th className="p-3 pr-5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {batch.contaminationLogs.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 pl-5 text-slate-400">
                    {new Date(c.loggedAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 font-medium text-white">{c.phaseDetected}</td>
                  <td className="p-3 font-bold text-rose-400">{c.discardedBagsCount} bags</td>
                  <td className="p-3 text-slate-200">{c.reason.replace(/_/g, " ")}</td>
                  <td className="p-3 pr-5 text-slate-400">{c.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
