import React from "react";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/tenant/permissions";
import {
  getBusinessCapitalContributions,
  getBusinessPartnerDrawings,
  getPartnerBalances,
} from "@/modules/finance/services/capital.service";
import { getBusinessMembers } from "@/modules/core-tenancy/services/business.service";
import { FinanceNav } from "../finance-nav";
import { CapitalModal } from "./capital-modal";
import { DrawingModal } from "./drawing-modal";
import { DrawingApprovalBtn } from "./drawing-approval-btn";
import { Wallet, ShieldAlert, CheckCircle2, Clock, XCircle, ArrowUpRight, ArrowDownLeft } from "lucide-react";

export default async function CapitalPage() {
  const context = await tryGetTenantContext();

  if (!context) {
    redirect("/businesses");
  }

  const canView = hasPermission(context.role, "finance:capital:view");
  if (!canView) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Your role does not have authorization to view partner capital or drawings.
        </p>
      </div>
    );
  }

  const [contributions, drawings, members] = await Promise.all([
    getBusinessCapitalContributions(context.businessId),
    getBusinessPartnerDrawings(context.businessId),
    getBusinessMembers(context.businessId),
  ]);

  const partners = members
    .filter((m) => ["OWNER", "PARTNER_FINANCE", "PARTNER_OPERATIONS"].includes(m.role) && m.status === "ACTIVE")
    .map((m) => ({
      membershipId: m.id,
      fullName: m.fullName,
      email: m.email,
      role: m.role,
    }));

  const canManageCapital = hasPermission(context.role, "finance:capital:manage");
  const canApproveDrawings = hasPermission(context.role, "finance:drawings:approve");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-400" />
            <span>Partner Capital & Withdrawals</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track partner initial equity, additional investments, and approved drawings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DrawingModal partners={partners} />
          {canManageCapital && <CapitalModal partners={partners} />}
        </div>
      </div>

      <FinanceNav />

      {/* Capital Contributions Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span>Capital Contributions History ({contributions.length})</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Recorded equity investments into business accounts
          </span>
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Contributing Partner</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Payment Reference</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {contributions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No capital contributions logged yet.
                    </td>
                  </tr>
                ) : (
                  contributions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(c.contributionDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {c.membership.user.fullName}
                        <span className="block text-[11px] text-slate-500 font-normal">
                          {c.membership.user.email}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {c.membership.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                        {c.paymentReference || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        {c.notes || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        +{c.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Partner Drawings / Withdrawals Table */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4 text-amber-400" />
            <span>Partner Withdrawals & Drawings ({drawings.length})</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Requires dual sign-off from co-owners
          </span>
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Request Date</th>
                  <th className="py-3 px-4">Partner</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {drawings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No partner drawing requests recorded.
                    </td>
                  </tr>
                ) : (
                  drawings.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(d.requestDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {d.membership.user.fullName}
                        <span className="block text-[11px] text-slate-500 font-normal">
                          {d.membership.user.email}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {d.membership.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {d.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        ) : d.status === "PENDING_APPROVAL" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Pending Co-Owner Sign-Off
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                        -{d.amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {d.status === "PENDING_APPROVAL" && (
                          <DrawingApprovalBtn
                            drawingId={d.id}
                            canApprove={canApproveDrawings}
                          />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
