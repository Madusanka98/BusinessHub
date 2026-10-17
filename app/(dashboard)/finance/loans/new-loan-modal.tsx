"use client";

import React, { useState, useActionState } from "react";
import { recordPartnerLoanAction } from "@/modules/finance/actions/finance.actions";
import { PlusCircle, Loader2, X, Landmark, CheckCircle2 } from "lucide-react";
import { ActionResult } from "@/modules/core-tenancy/actions/business.actions";

interface PartnerOption {
  membershipId: string;
  fullName: string;
  email: string;
  role: string;
}

interface NewLoanModalProps {
  partners: PartnerOption[];
}

const initialState: ActionResult = { success: false };

export function NewLoanModal({ partners }: NewLoanModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(recordPartnerLoanAction, initialState);

  React.useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
      >
        <PlusCircle className="w-4 h-4" />
        <span>New Loan Agreement</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Loan Agreement</h3>
                  <p className="text-xs text-slate-400">Partner financing or business advance.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
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
                  <span>Loan agreement registered successfully!</span>
                </div>
              )}

              <div>
                <label htmlFor="membershipId" className="block text-xs font-medium text-slate-300 mb-1">
                  Partner <span className="text-rose-400">*</span>
                </label>
                <select
                  id="membershipId"
                  name="membershipId"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select Partner...</option>
                  {partners.map((p) => (
                    <option key={p.membershipId} value={p.membershipId}>
                      {p.fullName} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="loanDirection" className="block text-xs font-medium text-slate-300 mb-1">
                  Loan Direction
                </label>
                <select
                  id="loanDirection"
                  name="loanDirection"
                  defaultValue="PARTNER_TO_BUSINESS"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="PARTNER_TO_BUSINESS">
                    Partner lent to Business (Business liability)
                  </option>
                  <option value="BUSINESS_TO_PARTNER">
                    Business advance to Partner (Partner liability)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="principalAmount" className="block text-xs font-medium text-slate-300 mb-1">
                    Principal Amount <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    id="principalAmount"
                    name="principalAmount"
                    required
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="annualInterestRate" className="block text-xs font-medium text-slate-300 mb-1">
                    Annual Interest %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    id="annualInterestRate"
                    name="annualInterestRate"
                    defaultValue="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-xs font-medium text-slate-300 mb-1">
                    Issuance Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="maturityDate" className="block text-xs font-medium text-slate-300 mb-1">
                    Maturity / Due Date
                  </label>
                  <input
                    type="date"
                    id="maturityDate"
                    name="maturityDate"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-medium text-slate-300 mb-1">
                  Terms / Description
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  placeholder="e.g. Substrate autoclave bridge financing"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Record Loan</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
