import React from "react";
import Link from "next/link";
import { getTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import { MushroomNav } from "../mushroom-nav";
import { getContaminationLogs } from "@/modules/mushroom/services/contamination.service";
import { getProductionBatches } from "@/modules/mushroom/services/batch.service";
import { RecordContaminationModal } from "./record-contamination-modal";
import { AlertTriangle, Layers, Calendar } from "lucide-react";

export default async function MushroomContaminationPage() {
  const context = await getTenantContext();
  assertTenantPermission(context, "mushroom:waste:log");

  const businessId = context.businessId;
  const logs = await getContaminationLogs(businessId);
  const activeBatches = await getProductionBatches(businessId, {
    status: "ACTIVE",
  });

  const totalDiscarded = logs.reduce((acc, curr) => acc + curr.discardedBagsCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
            <span>Contamination & Waste Logs</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Auditable record of discarded bags, pathogenic outbreaks, and cultivation loss reasons.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            Total Discarded: {totalDiscarded.toLocaleString()} bags
          </div>
          <RecordContaminationModal
            activeBatches={activeBatches.map((b) => ({
              id: b.id,
              batchCode: b.batchCode,
              strainName: b.strain.name,
              currentPhase: b.currentPhase,
              viableBagsCount: b.viableBagsCount,
            }))}
          />
        </div>
      </div>

      <MushroomNav />

      {/* Contamination Logs Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No contamination or waste incidents recorded. Excellent sanitation hygiene!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5 pl-5">Date Logged</th>
                  <th className="p-3.5">Batch Code</th>
                  <th className="p-3.5">Phase Detected</th>
                  <th className="p-3.5">Discarded Bags</th>
                  <th className="p-3.5">Pathogen / Reason</th>
                  <th className="p-3.5 pr-5">Observations & Action Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 pl-5 text-slate-400">
                      <div className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{new Date(log.loggedAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold text-white">
                      <Link
                        href={`/mushroom/batches/${log.batch.id}`}
                        className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.batch.batchCode}</span>
                      </Link>
                      <div className="text-[11px] text-slate-500">{log.batch.strain.name}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {log.phaseDetected}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-rose-400">
                      {log.discardedBagsCount} bags
                    </td>
                    <td className="p-3.5">
                      <span className="font-medium text-slate-200">
                        {log.reason.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-slate-400">
                      {log.notes || "—"}
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
