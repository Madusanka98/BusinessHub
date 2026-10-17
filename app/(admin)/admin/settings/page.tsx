import React from "react";
import { getPlatformSettings } from "@/modules/reports/services/saas-admin.service";
import { PlatformSettingsClient } from "./platform-settings-client";
import { Settings } from "lucide-react";

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-400" />
          <span>Platform-Wide Configuration</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Global application branding, currency, default timezone, and operational maintenance switches.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <PlatformSettingsClient settings={settings} />
      </div>
    </div>
  );
}
