import React from "react";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/tenant/permissions";
import { getBusinessAuditTrail } from "@/modules/core-tenancy/services/business.service";
import { History, ShieldAlert, User, ShieldCheck, Activity } from "lucide-react";

export default async function ActivityPage() {
  const context = await tryGetTenantContext();

  if (!context) {
    redirect("/businesses");
  }

  const canView = hasPermission(context.role, "tenancy:audit:view");
  if (!canView) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Your current role does not have authorization to view the immutable audit history for this business organization.
        </p>
      </div>
    );
  }

  const events = await getBusinessAuditTrail(context.businessId, 50);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-400" />
            <span>Business Activity History</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable, tenant-isolated audit log for governance and compliance.
          </p>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Last 50 events
        </span>
      </div>

      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="divide-y divide-slate-800/80">
          {events.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No audit records logged yet for this organization.
            </div>
          ) : (
            events.map((e) => {
              const dateStr = new Date(e.timestamp).toLocaleString();

              return (
                <div key={e.id} className="p-4 sm:p-5 hover:bg-slate-800/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {e.actionType}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                            {e.targetEntity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>{e.actor.fullName} ({e.actor.email})</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-500 font-mono sm:self-center">
                      {dateStr}
                    </div>
                  </div>

                  {e.changeDetails && (
                    <div className="mt-3 pl-10">
                      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-[11px] font-mono text-slate-400 overflow-x-auto">
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(e.changeDetails, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
