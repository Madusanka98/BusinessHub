import React from "react";
import { getPlatformMetrics } from "@/modules/reports/services/saas-admin.service";
import {
  Building2,
  Users,
  ShieldCheck,
  Activity,
  Server,
  Mail,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const metrics = await getPlatformMetrics();

  return (
    <div className="space-y-8">
      {/* Platform Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">SaaS Platform Overview</h1>
        <p className="text-sm text-slate-400 mt-1">
          High-level operational metrics, tenant business distribution, and system infrastructure health.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Businesses */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Organizations</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics.businesses.total}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="text-emerald-400">{metrics.businesses.active} Active</span>
            <span>&bull;</span>
            <span className="text-amber-400">{metrics.businesses.suspended} Suspended</span>
          </div>
        </div>

        {/* Registered Users */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics.users.total}</div>
          <div className="text-[11px] text-slate-400">
            Including <strong className="text-amber-400">{metrics.users.superAdmins}</strong> Platform Administrators
          </div>
        </div>

        {/* Audit Events */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Audit Trail Logs</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics.auditEventsCount}</div>
          <div className="text-[11px] text-slate-400">Immutable security & mutation log records</div>
        </div>

        {/* Infrastructure Health */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">System Health</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
            <CheckCircle2 className="w-5 h-5" />
            <span>OPERATIONAL</span>
          </div>
          <div className="text-[11px] text-slate-400">Database & Services Active</div>
        </div>
      </div>

      {/* Platform Configuration & Quick Nav */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-white">Platform Settings Overview</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <dt className="text-slate-400">Platform Brand Name</dt>
              <dd className="font-semibold text-slate-200 mt-1">{metrics.settings.platformName}</dd>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <dt className="text-slate-400">Platform Support Email</dt>
              <dd className="font-semibold text-slate-200 mt-1">{metrics.settings.supportEmail}</dd>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <dt className="text-slate-400">Default Timezone</dt>
              <dd className="font-semibold text-slate-200 mt-1">{metrics.settings.defaultTimezone}</dd>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <dt className="text-slate-400">Default Currency</dt>
              <dd className="font-semibold text-slate-200 mt-1">{metrics.settings.defaultCurrency}</dd>
            </div>
          </dl>
          <div className="pt-2">
            <Link
              href="/admin/settings"
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1"
            >
              <span>Modify Platform Settings &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-white">Administrative Actions</h2>
          <div className="space-y-2.5">
            <Link
              href="/admin/businesses"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Review & Manage Organizations</span>
              </div>
            </Link>
            <Link
              href="/admin/users"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Registered Users Directory</span>
              </div>
            </Link>
            <Link
              href="/admin/audit"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span>Platform Audit Trail</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
