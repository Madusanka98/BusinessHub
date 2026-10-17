"use client";

import React, { useState, useTransition } from "react";
import {
  updateMemberRoleAction,
  removeMemberAction,
} from "@/modules/core-tenancy/actions/business.actions";
import { MembershipRole } from "@prisma/client";
import { Edit2, UserMinus, ShieldAlert, Loader2, X, Check } from "lucide-react";

interface MemberActionsProps {
  member: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    role: MembershipRole;
    status: string;
    equityPercentage: string;
    profitSharePercentage: string;
  };
  currentUserId: string;
  canManageRoles: boolean;
  canRevoke: boolean;
  totalActiveOwners: number;
}

export function MemberActions({
  member,
  currentUserId,
  canManageRoles,
  canRevoke,
  totalActiveOwners,
}: MemberActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isLastOwner = member.role === "OWNER" && totalActiveOwners <= 1;
  const isSelf = member.userId === currentUserId;

  const handleRemove = () => {
    if (isLastOwner) {
      alert("Cannot remove the last active owner. The business must maintain at least one active owner.");
      return;
    }

    if (!confirm(`Are you sure you want to revoke membership for ${member.fullName} (${member.email})? They will immediately lose all access to this business.`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await removeMemberAction(member.id);
      if (!res.success) {
        setError(res.error || "Failed to remove member.");
      }
    });
  };

  const handleUpdateRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("memberId", member.id);

    setError(null);
    startTransition(async () => {
      const res = await updateMemberRoleAction(null, formData);
      if (!res.success) {
        setError(res.error || "Failed to update member role.");
      } else {
        setIsEditOpen(false);
      }
    });
  };

  if (!canManageRoles && !canRevoke) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {error && (
        <span className="text-[10px] text-rose-400 mr-2 max-w-[150px] truncate" title={error}>
          {error}
        </span>
      )}

      {canManageRoles && member.status === "ACTIVE" && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsEditOpen(true);
          }}
          title="Edit Member Role & Equity"
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}

      {canRevoke && member.status === "ACTIVE" && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isPending || isLastOwner}
          title={isLastOwner ? "Cannot revoke the sole active owner" : "Revoke Membership"}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isLastOwner
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-400 hover:text-rose-400 hover:bg-slate-800"
          }`}
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Edit Role Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm text-left">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Edit Role: {member.fullName}</h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4 pt-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="role" className="block text-xs font-medium text-slate-300 mb-1">
                  Membership Role
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue={member.role}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="OWNER">OWNER (Full governance & co-ownership)</option>
                  <option value="PARTNER_FINANCE">PARTNER_FINANCE (Finance & accounting)</option>
                  <option value="PARTNER_OPERATIONS">PARTNER_OPERATIONS (Operations partner)</option>
                  <option value="STAFF">STAFF (Operations employee)</option>
                  <option value="VIEWER">VIEWER (Read-only observer)</option>
                </select>
                {isLastOwner && (
                  <p className="text-[10px] text-amber-400 mt-1">
                    * This member is currently the sole active owner. Changing this role will require assigning another owner first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="equityPercentage" className="block text-xs font-medium text-slate-300 mb-1">
                    Equity %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    id="equityPercentage"
                    name="equityPercentage"
                    defaultValue={member.equityPercentage}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="profitSharePercentage" className="block text-xs font-medium text-slate-300 mb-1">
                    Profit Share %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    id="profitSharePercentage"
                    name="profitSharePercentage"
                    defaultValue={member.profitSharePercentage}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Update Role</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
