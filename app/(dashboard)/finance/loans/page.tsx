import React from "react";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/tenant/permissions";
import { getBusinessLoans } from "@/modules/finance/services/loan.service";
import { getBusinessMembers } from "@/modules/core-tenancy/services/business.service";
import { FinanceNav } from "../finance-nav";
import { NewLoanModal } from "./new-loan-modal";
import { RepayLoanModal } from "./repay-loan-modal";
import { Landmark, ShieldAlert, CheckCircle2, Clock, AlertTriangle, ArrowRight } from "lucide-react";

export default async function LoansPage() {
  const context = await tryGetTenantContext();

  if (!context) {
    redirect("/businesses");
  }

  const canView = hasPermission(context.role, "finance:loans:view");
  if (!canView) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Your role does not have authorization to view partner loans or debt obligations.
        </p>
      </div>
    );
  }

  const [loans, members] = await Promise.all([
    getBusinessLoans(context.businessId),
    getBusinessMembers(context.businessId),
  ]);

  const partners = members
    .filter(
      (m) =>
        (m.role === "OWNER" || m.role === "PARTNER_FINANCE" || m.role === "PARTNER_OPERATIONS") &&
        m.status === "ACTIVE"
    )
    .map((m) => ({
      membershipId: m.id,
      fullName: m.fullName,
      email: m.email,
      role: m.role,
    }));

  const canManageLoans = hasPermission(context.role, "finance:loans:manage");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-emerald-400" />
            <span>Partner & Business Loans</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track financing advances, interest terms, outstanding debt, and amortized repayments.
          </p>
        </div>

        {canManageLoans && <NewLoanModal partners={partners} />}
      </div>

      <FinanceNav />

      {/* Loans Ledger Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">Partner</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4">Interest Rate</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Principal</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No partner or business loans recorded.
                  </td>
                </tr>
              ) : (
                loans.map((l) => {
                  const isPartnerToBusiness = l.loanDirection === "PARTNER_TO_BUSINESS";
                  const isRepaid = l.status === "REPAID";

                  return (
                    <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(l.startDate).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {l.membership.user.fullName}
                        <span className="block text-[11px] text-slate-500 font-normal">
                          {l.description || l.membership.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                            isPartnerToBusiness
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {isPartnerToBusiness ? "Partner -> Business" : "Business -> Partner"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {Number(l.annualInterestRate).toFixed(2)}% APR
                      </td>

                      <td className="py-3.5 px-4">
                        {isRepaid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Settled / Repaid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Active Loan
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {Number(l.principalAmount).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        {Number(l.outstandingBalance).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {!isRepaid && canManageLoans && (
                          <RepayLoanModal
                            loan={{
                              id: l.id,
                              principalAmount: l.principalAmount.toString(),
                              outstandingBalance: l.outstandingBalance.toString(),
                              annualInterestRate: l.annualInterestRate.toString(),
                              partnerName: l.membership.user.fullName,
                            }}
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
