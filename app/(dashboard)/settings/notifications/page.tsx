import React from "react";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import { getNotificationPreferences } from "@/modules/reports/services/notifications.service";
import { NotificationPreferencesClient } from "./notification-preferences-client";
import { BellRing } from "lucide-react";
import Link from "next/link";

export default async function NotificationSettingsPage() {
  const context = await tryGetTenantContext();
  if (!context) {
    redirect("/businesses");
  }

  assertTenantPermission(context, "notifications:preferences:manage");

  const preferences = await getNotificationPreferences(context.businessId, context.userId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BellRing className="w-6 h-6 text-emerald-400" />
            <span>Notification Preferences</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure automated email notifications and delivery channels for your account in this organization.
          </p>
        </div>

        <Link
          href="/reports"
          className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
        >
          &larr; Back to Reports
        </Link>
      </div>

      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <NotificationPreferencesClient preferences={preferences} />
      </div>
    </div>
  );
}
