"use client";

import React, { useState, useActionState } from "react";
import { requestPartnerDrawingAction } from "@/modules/finance/actions/finance.actions";
import { PlusCircle, Loader2, X, Wallet, CheckCircle2 } from "lucide-react";
import { ActionResult } from "@/modules/core-tenancy/actions/business.actions";

interface PartnerOption {
  membershipId: string;
  fullName: string;
  email: string;
  role: string;
}

interface DrawingModalProps {
  partners: PartnerOption[];
}

const initialState: ActionResult = { success: false };

export function DrawingModal({ partners }: DrawingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(requestPartnerDrawingAction, initialState);

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
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
      >
        <PlusCircle className="w-4 h-4 text-amber-400" />
        <span>Request Withdrawal</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Partner Drawing Request</h3>
                  <p className="text-xs text-slate-400">Request capital withdrawal or profit drawing.</p>
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
                  <span>Drawing requested successfully!</span>
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
                <label htmlFor="amount" className="block text-xs font-medium text-slate-300 mb-1">
                  Requested Amount <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  id="amount"
                  name="amount"
                  required
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-950/40 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Submit Request</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
