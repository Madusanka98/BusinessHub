import React from "react";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/tenant/permissions";
import {
  getActiveProfitSharingRule,
  getClosedPeriods,
} from "@/modules/finance/services/profitSharing.service";
import { getBusinessDetails } from "@/modules/core-tenancy/services/business.service";
import { FinanceNav } from "../finance-nav";
import { RuleConfigForm } from "./rule-config-form";
import { ClosePeriodModal } from "./close-period-modal";
import { PieChart, ShieldAlert, CheckCircle2, Lock, Calendar, Layers, ShieldCheck } from "lucide-react";

export default async function ProfitSharingPage() {
  const context = await tryGetTenantContext();

  if (!context) {
    redirect("/businesses");
  }

  const canView = hasPermission(context.role, "finance:rules:view");
  if (!canView) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Your role does not have authorization to view profit-sharing formulas or closed period accounting distributions.
        </p>
      </div>
    );
  }

  const [activeRule, closedPeriods, business] = await Promise.all([
    getActiveProfitSharingRule(context.businessId),
    getClosedPeriods(context.businessId),
    getBusinessDetails(context.businessId),
  ]);

  const canManageRules = hasPermission(context.role, "finance:rules:manage");
  const canClosePeriod = hasPermission(context.role, "finance:period:close");
  const defaultReserve = Number(business.settings?.defaultReservePercentage || 20);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <PieChart className="w-6 h-6 text-emerald-400" />
            <span>Profit Sharing & Closed Periods</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic allocation rules, period finalization, and distribution vouchers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManageRules && <RuleConfigForm currentRule={activeRule} />}
          {canClosePeriod && <ClosePeriodModal defaultReservePercentage={defaultReserve} />}
        </div>
      </div>

      <FinanceNav />

      {/* Active Rule Details Banner */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold mb-1.5">
              <CheckCircle2 className="w-3 h-3" />
              ACTIVE FORMULA (VERSION {activeRule.version})
            </div>
            <h2 className="text-lg font-bold text-white">{activeRule.name}</h2>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium border border-slate-700">
              Model: <strong className="text-emerald-400">{activeRule.ruleType.replace("_", " ")}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium border border-slate-700">
              Loss Policy: <strong className="text-purple-400">{activeRule.lossPolicy.replace("_", " ")}</strong>
            </span>
          </div>
        </div>

        {/* Allocations Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Allocated Stakeholders Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeRule.allocations.map((a) => (
              <div
                key={a.membershipId}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-200">{a.fullName}</p>
                  <p className="text-[10px] text-slate-500">{a.role}</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-emerald-400">
                    {a.percentage.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Closed Periods History */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <span>Closed Financial Periods & Finalized Distributions ({closedPeriods.length})</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Immutable accounting snapshots
          </span>
        </div>

        <div className="space-y-4">
          {closedPeriods.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No closed accounting periods on record. Use &quot;Close Period & Distribute&quot; at the end of a fiscal cycle.
            </div>
          ) : (
            closedPeriods.map((cp) => (
              <div
                key={cp.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{cp.periodName}</h3>
                      <p className="text-xs text-slate-400">
                        {new Date(cp.startDate).toLocaleDateString()} &ndash;{" "}
                        {new Date(cp.endDate).toLocaleDateString()} &bull; Closed on{" "}
                        {new Date(cp.closedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block">REVENUE</span>
                      <span className="text-slate-200 font-semibold">{Number(cp.totalIncome).toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block">EXPENSES</span>
                      <span className="text-slate-200 font-semibold">{Number(cp.totalExpense).toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block">NET PROFIT</span>
                      <span className="text-emerald-400 font-bold">{Number(cp.netProfit).toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block">RESERVE</span>
                      <span className="text-purple-400 font-semibold">{Number(cp.retainedReserve).toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block">DISTRIBUTED</span>
                      <span className="text-emerald-400 font-bold">{Number(cp.distributedAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Partner distribution allocations in this period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {cp.distributions.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          {d.membership.user.fullName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {Number(d.profitSharePercentage).toFixed(2)}% share
                        </p>
                      </div>
                      <div className="text-right font-mono font-bold text-xs text-purple-400">
                        {Number(d.allocatedAmount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
