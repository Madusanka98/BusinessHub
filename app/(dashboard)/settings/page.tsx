import React from "react";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/tenant/permissions";
import { getBusinessDetails } from "@/modules/core-tenancy/services/business.service";
import { SettingsForm } from "./settings-form";
import { Settings, ShieldAlert } from "lucide-react";

export default async function BusinessSettingsPage() {
  const context = await tryGetTenantContext();

  if (!context) {
    redirect("/businesses");
  }

  const canUpdate = hasPermission(context.role, "tenancy:settings:update");

  if (!canUpdate) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Permission Denied</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Your current role (<strong className="text-emerald-400">{context.role}</strong>) does not have authorization to modify business profile or financial configuration.
        </p>
      </div>
    );
  }

  const business = await getBusinessDetails(context.businessId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-400" />
          <span>Business Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure profile details, operating timezone, and tenant-level financial thresholds.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <SettingsForm business={business} />
      </div>
    </div>
  );
}
