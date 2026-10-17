import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/tenant/permissions";
import { getFinancialSummary, getBusinessTransactions } from "@/modules/finance/services/transaction.service";
import { getPartnerBalances } from "@/modules/finance/services/capital.service";
import { FinanceNav } from "./finance-nav";
import {
  TrendingUp,
  TrendingDown,
  Coins,
  ShieldAlert,
  ArrowRight,
  Receipt,
  Wallet,
  Landmark,
  PiggyBank,
} from "lucide-react";

export default async function FinanceOverviewPage() {
  const context = await tryGetTenantContext();

  if (!context) {
    redirect("/businesses");
  }

  const canView = hasPermission(context.role, "finance:transactions:view");
  if (!canView) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Your role (<strong className="text-emerald-400">{context.role}</strong>) does not have authorization to view financial accounts or partner balances.
        </p>
      </div>
    );
  }

  const [summary, partnerBalances, recentTx] = await Promise.all([
    getFinancialSummary(context.businessId),
    getPartnerBalances(context.businessId),
    getBusinessTransactions(context.businessId, { limit: 5 }),
  ]);

  const isNetProfitPositive = summary.netProfit.greaterThanOrEqualTo(0);

  return (
    <div className="space-y-8">
      {/* Module Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Coins className="w-6 h-6 text-emerald-400" />
          <span>Finance & Profit Sharing</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Multi-tenant financial ledgers, partner equity accounting, and auditable profit distribution.
        </p>
      </div>

      <FinanceNav />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recognized Revenue */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Recognized Revenue
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">
              {Number(summary.totalIncome).toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Confirmed sales and operational income.
          </p>
        </div>

        {/* Operating Expenses */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Operating Expenses
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">
              {Number(summary.totalExpense).toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Approved production & operating costs.
          </p>
        </div>

        {/* Net Operating Profit */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Net Operating Profit
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-2xl font-bold font-mono ${
                isNetProfitPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {Number(summary.netProfit).toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Revenue minus operating expenses.
          </p>
        </div>

        {/* Total Partner Capital Pool */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Active Partners
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">
              {partnerBalances.length}
            </span>
            <span className="text-xs text-slate-500 ml-1.5">Stakeholders</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Owners and equity-holding partners.
          </p>
        </div>
      </div>

      {/* Partner Positions & Balances */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>Partner Capital & Drawing Position Summary</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Net Position = (Capital + Profit Distributions) - Drawings
          </span>
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Partner</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Contributed Capital</th>
                  <th className="py-3 px-4 text-right">Profit Distributions</th>
                  <th className="py-3 px-4 text-right">Withdrawals (Drawings)</th>
                  <th className="py-3 px-4 text-right">Net Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {partnerBalances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No partner equity records found.
                    </td>
                  </tr>
                ) : (
                  partnerBalances.map((p) => {
                    const isPositive = Number(p.netPosition) >= 0;

                    return (
                      <tr key={p.membershipId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {p.fullName}
                          <span className="block text-[11px] text-slate-500 font-normal">{p.email}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {p.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                          {p.totalCapital}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-purple-400">
                          {p.totalDistributions}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-amber-400">
                          {p.totalDrawings}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-mono font-bold ${
                            isPositive ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {p.netPosition}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Transactions Snippet */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>Recent Financial Entries</span>
          </h2>
          <Link
            href="/finance/transactions"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
          >
            <span>View Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800/60">
            {recentTx.transactions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No financial transactions recorded yet.
              </div>
            ) : (
              recentTx.transactions.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          t.type === "INCOME"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-rose-500/15 text-rose-400"
                        }`}
                      >
                        {t.type}
                      </span>
                      <span className="text-xs font-semibold text-white">{t.category.name}</span>
                    </div>
                    <p className="text-xs text-slate-400">{t.description}</p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono text-sm font-bold ${
                        t.type === "INCOME" ? "text-emerald-400" : "text-slate-200"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : "-"}
                      {Number(t.amount).toFixed(2)}
                    </span>
                    <p className="text-[10px] text-slate-500">{new Date(t.transactionDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
