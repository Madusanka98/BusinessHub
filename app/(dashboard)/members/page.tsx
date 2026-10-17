import React from "react";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/tenant/permissions";
import {
  getBusinessMembers,
  getBusinessInvitations,
  getBusinessDetails,
} from "@/modules/core-tenancy/services/business.service";
import { InviteMemberModal } from "./invite-member-modal";
import { MemberActions } from "./member-actions";
import { InvitationActions } from "./invitation-actions";
import { Users, Mail, ShieldAlert, Shield, CheckCircle2, Clock } from "lucide-react";

export default async function MembersPage() {
  const context = await tryGetTenantContext();

  if (!context) {
    redirect("/businesses");
  }

  const canView = hasPermission(context.role, "tenancy:members:view");
  if (!canView) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Your current role does not have permission to view members or manage invitations for this business.
        </p>
      </div>
    );
  }

  const [members, invitations, business] = await Promise.all([
    getBusinessMembers(context.businessId),
    getBusinessInvitations(context.businessId),
    getBusinessDetails(context.businessId),
  ]);

  const activeOwners = members.filter((m) => m.role === "OWNER" && m.status === "ACTIVE");
  const pendingOwnerInvites = invitations.filter((i) => i.role === "OWNER");
  const totalOwnerCommitment = activeOwners.length + pendingOwnerInvites.length;
  const isOwnerQuotaFull = totalOwnerCommitment >= business.maxOwners;

  const canManageRoles = hasPermission(context.role, "tenancy:members:manage_roles");
  const canRevoke = hasPermission(context.role, "tenancy:members:revoke");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>Members & Partners</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage co-owners, partners, equity shares, and operating personnel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 font-medium">Owners Quota:</span>
            <span className="text-white font-bold">
              {activeOwners.length} active + {pendingOwnerInvites.length} pending / {business.maxOwners} Max
            </span>
          </div>

          <InviteMemberModal
            userRole={context.role}
            isOwnerQuotaFull={isOwnerQuotaFull}
          />
        </div>
      </div>

      {/* Active Members Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Active Team Members ({members.filter((m) => m.status === "ACTIVE").length})</span>
          </h2>
          <span className="text-[11px] text-slate-500">Tenant-isolated access strictly enforced</span>
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Equity Share</th>
                  <th className="py-3 px-4">Profit Share</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No members found for this organization.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => {
                    const isOwner = m.role === "OWNER";
                    const isSelf = m.userId === context.userId;

                    return (
                      <tr
                        key={m.id}
                        className={`hover:bg-slate-800/30 transition-colors ${
                          m.status === "REVOKED" ? "opacity-40" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[11px] text-emerald-400 border border-slate-700">
                              {m.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-200">
                                {m.fullName} {isSelf && <span className="text-emerald-400 text-[10px] font-normal">(You)</span>}
                              </p>
                              <p className="text-[11px] text-slate-400">{m.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                              isOwner
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : m.role.startsWith("PARTNER")
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                : "bg-slate-800 text-slate-300 border-slate-700"
                            }`}
                          >
                            {m.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {Number(m.equityPercentage) > 0 ? `${m.equityPercentage}%` : "—"}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {Number(m.profitSharePercentage) > 0 ? `${m.profitSharePercentage}%` : "—"}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                              m.status === "ACTIVE"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-rose-500/15 text-rose-400"
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <MemberActions
                            member={m}
                            currentUserId={context.userId}
                            canManageRoles={canManageRoles}
                            canRevoke={canRevoke}
                            totalActiveOwners={activeOwners.length}
                          />
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

      {/* Pending Invitations Table */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400" />
            <span>Pending Invitations ({invitations.length})</span>
          </h2>
          <span className="text-[11px] text-slate-500">Unclaimed tokens expire in 48 hours</span>
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Recipient Email</th>
                  <th className="py-3 px-4">Role Offered</th>
                  <th className="py-3 px-4">Proposed Equity</th>
                  <th className="py-3 px-4">Profit Share</th>
                  <th className="py-3 px-4">Expires In</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invitations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No pending invitations for this organization.
                    </td>
                  </tr>
                ) : (
                  invitations.map((i) => {
                    const hoursLeft = Math.max(
                      0,
                      Math.round((new Date(i.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))
                    );

                    return (
                      <tr key={i.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {i.email}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {i.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {i.proposedEquity ? `${i.proposedEquity.toString()}%` : "—"}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {i.proposedProfitShare ? `${i.proposedProfitShare.toString()}%` : "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{hoursLeft} hours remaining</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <InvitationActions
                            invitationId={i.id}
                            email={i.email}
                            canRevoke={canRevoke}
                          />
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
    </div>
  );
}
