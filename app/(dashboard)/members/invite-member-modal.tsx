"use client";

import React, { useActionState, useState } from "react";
import { inviteMemberAction, ActionResult } from "@/modules/core-tenancy/actions/business.actions";
import type { MembershipRole } from "@prisma/client";
import { UserPlus, Mail, Shield, Percent, Loader2, X, CheckCircle2 } from "lucide-react";

interface InviteMemberModalProps {
  userRole: MembershipRole;
  isOwnerQuotaFull: boolean;
}

const initialState: ActionResult<{ invitationId: string }> = { success: false };

export function InviteMemberModal({ userRole, isOwnerQuotaFull }: InviteMemberModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(inviteMemberAction, initialState);
  const [selectedRole, setSelectedRole] = useState<MembershipRole>("STAFF");

  React.useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const canInviteOwner = userRole === "OWNER";
  const canInvitePartner = userRole === "OWNER";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-colors cursor-pointer"
      >
        <UserPlus className="w-4 h-4" />
        <span>Invite Member</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Send Business Invitation</h3>
                  <p className="text-xs text-slate-400">Dispatch a secure, 48-hour single-use onboarding link.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action={formAction} className="space-y-4 pt-4">
              {state.error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  {state.error}
                </div>
              )}

              {state.success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Invitation created and dispatched successfully!</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Recipient Email <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="partner@domain.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                {state.fieldErrors?.email && (
                  <p className="text-[11px] text-rose-400 mt-1">{state.fieldErrors.email[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="role" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Assigned Role <span className="text-rose-400">*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as MembershipRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {canInviteOwner && (
                    <option value="OWNER" disabled={isOwnerQuotaFull}>
                      OWNER (Full governance & legal authority) {isOwnerQuotaFull ? "(Limit Reached)" : ""}
                    </option>
                  )}
                  {canInvitePartner && (
                    <>
                      <option value="PARTNER_FINANCE">PARTNER_FINANCE (Financial partner & equity)</option>
                      <option value="PARTNER_OPERATIONS">PARTNER_OPERATIONS (Operational partner)</option>
                    </>
                  )}
                  <option value="STAFF">STAFF (Operational execution & harvesting)</option>
                  <option value="VIEWER">VIEWER (Read-only auditor/advisor)</option>
                </select>
              </div>

              {(selectedRole === "OWNER" || selectedRole === "PARTNER_FINANCE" || selectedRole === "PARTNER_OPERATIONS") && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label htmlFor="proposedEquity" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Proposed Equity %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      id="proposedEquity"
                      name="proposedEquity"
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="proposedProfitShare" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Profit Share %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      id="proposedProfitShare"
                      name="proposedProfitShare"
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <span>Send Invitation</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
