"use client";

import React, { useState, useActionState } from "react";
import { closePeriodAction } from "@/modules/finance/actions/finance.actions";
import { Lock, Loader2, X, PieChart, CheckCircle2, AlertCircle } from "lucide-react";
import { ActionResult } from "@/modules/core-tenancy/actions/business.actions";

interface ClosePeriodModalProps {
  defaultReservePercentage: number;
}

const initialState: ActionResult = { success: false };

export function ClosePeriodModal({ defaultReservePercentage }: ClosePeriodModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(closePeriodAction, initialState);

  React.useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-950/40 transition-colors cursor-pointer"
      >
        <Lock className="w-4 h-4" />
        <span>Close Period & Distribute</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Close Accounting Period</h3>
                  <p className="text-xs text-slate-400">Lock transactions and finalize profit distribution.</p>
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

            <form action={formAction} className="space-y-4 pt-4">
              {state.error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {state.error}
                </div>
              )}

              {state.success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Period closed and profit distributions finalized!</span>
                </div>
              )}

              <div>
                <label htmlFor="periodName" className="block text-xs font-medium text-slate-300 mb-1">
                  Accounting Period Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="periodName"
                  name="periodName"
                  required
                  placeholder="e.g. October 2026 Close"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-xs font-medium text-slate-300 mb-1">
                    Start Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-xs font-medium text-slate-300 mb-1">
                    End Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="retainedReservePercentage" className="block text-xs font-medium text-slate-300 mb-1">
                  Retained Emergency Reserve %
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  id="retainedReservePercentage"
                  name="retainedReservePercentage"
                  defaultValue={defaultReservePercentage}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Portion of net profit retained inside business bank account before partner distribution.
                </p>
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-medium text-slate-300 mb-1">
                  Closing Notes
                </label>
                <input
                  type="text"
                  id="notes"
                  name="notes"
                  placeholder="e.g. Q4 final harvest cycle distributions"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Notice:</strong> Closing a period locks all contained transactions from further edits and calculates deterministic partner distribution vouchers based on the active profit-sharing agreement.
                </span>
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
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-950/40 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Lock & Finalize</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
