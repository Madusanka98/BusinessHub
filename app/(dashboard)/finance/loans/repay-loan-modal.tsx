"use client";

import React, { useState, useActionState } from "react";
import { recordLoanRepaymentAction } from "@/modules/finance/actions/finance.actions";
import { Loader2, X, Landmark, CheckCircle2, DollarSign } from "lucide-react";
import { ActionResult } from "@/modules/core-tenancy/actions/business.actions";

interface RepayLoanModalProps {
  loan: {
    id: string;
    principalAmount: { toString(): string } | string;
    outstandingBalance: { toString(): string } | string;
    annualInterestRate: { toString(): string } | string;
    partnerName: string;
  };
}

const initialState: ActionResult = { success: false };

export function RepayLoanModal({ loan }: RepayLoanModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(recordLoanRepaymentAction, initialState);

  React.useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const maxRepay = Number(loan.outstandingBalance.toString());

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
      >
        <DollarSign className="w-3 h-3" />
        <span>Record Payment</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm text-left">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Loan Repayment</h3>
                  <p className="text-xs text-slate-400">{loan.partnerName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 my-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between">
              <span className="text-slate-400">Outstanding Balance:</span>
              <span className="font-mono font-bold text-emerald-400">
                {loan.outstandingBalance.toString()}
              </span>
            </div>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="loanId" value={loan.id} />

              {state.error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {state.error}
                </div>
              )}

              {state.success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Repayment posted successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="principalAmount" className="block text-xs font-medium text-slate-300 mb-1">
                    Principal Paid <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={maxRepay}
                    id="principalAmount"
                    name="principalAmount"
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="interestAmount" className="block text-xs font-medium text-slate-300 mb-1">
                    Interest Paid
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    id="interestAmount"
                    name="interestAmount"
                    defaultValue="0.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="paymentDate" className="block text-xs font-medium text-slate-300 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  id="paymentDate"
                  name="paymentDate"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-medium text-slate-300 mb-1">
                  Notes / Transaction Ref
                </label>
                <input
                  type="text"
                  id="notes"
                  name="notes"
                  placeholder="e.g. Bank wire ref #9921"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Post Payment</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
