import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { getBusinessDetails } from "@/modules/core-tenancy/services/business.service";
import {
  Building2,
  Users,
  UserCheck,
  Mail,
  Settings,
  History,
  Shield,
  ArrowRight,
  Clock,
  Coins,
} from "lucide-react";

export default async function DashboardOverviewPage() {
  const context = await tryGetTenantContext();

  if (!context) {
    redirect("/businesses");
  }

  const business = await getBusinessDetails(context.businessId);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {business.status} ORGANIZATION
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {business.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-4">
              <span>Slug: <code className="text-slate-300 font-mono text-xs">{business.slug}</code></span>
              <span>&bull;</span>
              <span>Your Role: <strong className="text-emerald-400">{context.role}</strong></span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/members"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Manage Partners & Staff</span>
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Business Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Co-Owners Card */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Co-Owner Limit
            </span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{business.activeOwnersCount}</span>
            <span className="text-xs text-slate-500">/ {business.maxOwners} Max</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            1&ndash;10 owners quota enforced server-side.
          </p>
        </div>

        {/* Total Members */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Active Members
            </span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {business._count.memberships}
            </span>
            <span className="text-xs text-slate-500">Personnel</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Partners and operational staff.
          </p>
        </div>

        {/* Pending Invites */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Pending Invites
            </span>
            <Mail className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {business._count.invitationTokens}
            </span>
            <span className="text-xs text-slate-500">Unclaimed</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Expiring single-use secure links.
          </p>
        </div>

        {/* Currency & Finance Setup */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Operating Currency
            </span>
            <Coins className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {business.settings?.currency || "LKR"}
            </span>
            <span className="text-xs text-slate-500">
              {business.settings?.timezone || "Asia/Colombo"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Reserve: {business.settings?.defaultReservePercentage?.toString() || "20"}%
          </p>
        </div>
      </div>

      {/* Profile & Quick Navigation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Business Profile & Operational Scope</span>
          </h2>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <dt className="text-slate-400">Industry / Business Type</dt>
              <dd className="font-semibold text-slate-200 mt-1">
                {business.settings?.businessType || "General Business"}
              </dd>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <dt className="text-slate-400">Contact Email</dt>
              <dd className="font-semibold text-slate-200 mt-1">
                {business.settings?.contactEmail || "Not specified"}
              </dd>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <dt className="text-slate-400">Contact Phone</dt>
              <dd className="font-semibold text-slate-200 mt-1">
                {business.settings?.contactPhone || "Not specified"}
              </dd>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <dt className="text-slate-400">Timezone</dt>
              <dd className="font-semibold text-slate-200 mt-1">
                {business.settings?.timezone || "Asia/Colombo"}
              </dd>
            </div>
            <div className="sm:col-span-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <dt className="text-slate-400">Business Address</dt>
              <dd className="font-semibold text-slate-200 mt-1">
                {business.settings?.address || "No physical address configured."}
              </dd>
            </div>
          </dl>
        </div>

        {/* Quick Links / Actions */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-white">Management Actions</h2>

          <div className="space-y-2.5">
            <Link
              href="/members"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800/70 border border-slate-800 text-xs text-slate-200 font-medium transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Invite & Manage Members</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </Link>

            <Link
              href="/settings"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800/70 border border-slate-800 text-xs text-slate-200 font-medium transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-emerald-400" />
                <span>Configure Settings & Thresholds</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </Link>

            <Link
              href="/activity"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800/70 border border-slate-800 text-xs text-slate-200 font-medium transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-emerald-400" />
                <span>View Tenant Audit Trail</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </Link>

            <Link
              href="/businesses"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800/70 border border-slate-800 text-xs text-slate-200 font-medium transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Switch Active Organization</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
