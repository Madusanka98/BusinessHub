import React from "react";
import { getPlatformAuditLogs } from "@/modules/reports/services/saas-admin.service";
import { History, ShieldAlert } from "lucide-react";

export default async function AdminAuditPage() {
  const result = await getPlatformAuditLogs({ page: 1, limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-purple-400" />
          <span>Platform Audit Trail</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Immutable audit record of all tenant mutations, administrative actions, and system security events.
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Change Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {result.logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No platform audit events recorded.
                  </td>
                </tr>
              ) : (
                result.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {log.user ? log.user.fullName : "System / Job"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          log.actionType === "CREATE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : log.actionType === "UPDATE"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : log.actionType === "DELETE"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {log.actionType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{log.targetEntity}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {log.business ? log.business.name : "Platform Level"}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-300 font-mono text-[11px]">
                      {log.changeDetails ? JSON.stringify(log.changeDetails) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
