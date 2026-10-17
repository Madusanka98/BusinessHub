import React from "react";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import { ReportsNav } from "../reports-nav";
import { getScheduledReports } from "@/modules/reports/services/scheduler.service";
import { ScheduleManagerClient } from "./schedule-manager-client";

export default async function ScheduledReportsPage() {
  const context = await tryGetTenantContext();
  if (!context) {
    redirect("/businesses");
  }

  assertTenantPermission(context, "reports:schedule:manage");

  const schedules = await getScheduledReports(context.businessId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Scheduled Reports & Automations</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure recurring email delivery of operational reports and alerts for your organization.
        </p>
      </div>

      <ReportsNav />

      <ScheduleManagerClient schedules={schedules} />
    </div>
  );
}
