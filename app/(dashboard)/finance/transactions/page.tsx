import React from "react";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/tenant/permissions";
import {
  getBusinessTransactions,
  getTransactionCategories,
} from "@/modules/finance/services/transaction.service";
import { getBusinessDetails } from "@/modules/core-tenancy/services/business.service";
import { FinanceNav } from "../finance-nav";
import { RecordTransactionModal } from "./record-transaction-modal";
import { TransactionApprovalBtn } from "./transaction-approval-btn";
import { Receipt, ShieldAlert, Lock, CheckCircle2, Clock, XCircle, ExternalLink } from "lucide-react";
import { TransactionType } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
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
          Your role does not have authorization to view financial transactions.
        </p>
      </div>
    );
  }

  const resolvedParams = await searchParams;
  const filterType =
    resolvedParams.type === "INCOME"
      ? TransactionType.INCOME
      : resolvedParams.type === "EXPENSE"
      ? TransactionType.EXPENSE
      : undefined;

  const [categories, txData, business] = await Promise.all([
    getTransactionCategories(context.businessId),
    getBusinessTransactions(context.businessId, { type: filterType, limit: 100 }),
    getBusinessDetails(context.businessId),
  ]);

  const canApprove = hasPermission(context.role, "finance:transactions:approve");
  const expenseThreshold = Number(business.settings?.expenseApprovalThreshold || 500);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-400" />
            <span>Income & Expense Ledger</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Confirmed operational revenue and production expenses with dual approval tracking.
          </p>
        </div>

        <RecordTransactionModal
          categories={categories}
          expenseThreshold={expenseThreshold}
        />
      </div>

      <FinanceNav />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <a
          href="/finance/transactions"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            !filterType
              ? "bg-slate-800 text-white font-bold"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          All Entries ({txData.totalCount})
        </a>
        <a
          href="/finance/transactions?type=INCOME"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === TransactionType.INCOME
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          Income Only
        </a>
        <a
          href="/finance/transactions?type=EXPENSE"
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === TransactionType.EXPENSE
              ? "bg-rose-600/20 text-rose-400 border border-rose-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          Expenses Only
        </a>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {txData.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No transactions found for the selected filter.
                  </td>
                </tr>
              ) : (
                txData.transactions.map((t) => {
                  const isIncome = t.type === "INCOME";

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(t.transactionDate).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                            isIncome
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {t.category.name}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-200">
                        {t.description}
                        {t.receiptUrl && (
                          <a
                            href={t.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[11px] text-emerald-400 hover:underline ml-2"
                          >
                            <span>Receipt</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {t.paymentMethod.replace("_", " ")}
                      </td>

                      <td className="py-3 px-4">
                        {t.isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            <Lock className="w-3 h-3 text-slate-500" />
                            Locked (Period Closed)
                          </span>
                        ) : t.approvalStatus === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : t.approvalStatus === "PENDING_APPROVAL" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Pending Sign-Off
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                      </td>

                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          isIncome ? "text-emerald-400" : "text-slate-200"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {Number(t.amount).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {t.approvalStatus === "PENDING_APPROVAL" && (
                          <TransactionApprovalBtn
                            transactionId={t.id}
                            canApprove={canApprove}
                          />
                        )}
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
  );
}
