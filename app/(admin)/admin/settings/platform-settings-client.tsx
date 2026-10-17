"use client";

import React, { useState, useTransition } from "react";
import { updatePlatformSettingsAction } from "@/modules/reports/actions/reports.actions";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface PlatformSettingsClientProps {
  settings: {
    platformName: string;
    supportEmail: string;
    defaultTimezone: string;
    defaultCurrency: string;
    enableRegistration: boolean;
    maintenanceMode: boolean;
  };
}

export function PlatformSettingsClient({ settings }: PlatformSettingsClientProps) {
  const [platformName, setPlatformName] = useState(settings.platformName);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [defaultTimezone, setDefaultTimezone] = useState(settings.defaultTimezone);
  const [defaultCurrency, setDefaultCurrency] = useState(settings.defaultCurrency);
  const [enableRegistration, setEnableRegistration] = useState(settings.enableRegistration);
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode);

  const [isSaving, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData();
    fd.append("platformName", platformName);
    fd.append("supportEmail", supportEmail);
    fd.append("defaultTimezone", defaultTimezone);
    fd.append("defaultCurrency", defaultCurrency);
    fd.append("enableRegistration", enableRegistration ? "true" : "false");
    fd.append("maintenanceMode", maintenanceMode ? "true" : "false");

    startTransition(async () => {
      const res = await updatePlatformSettingsAction(null, fd);
      setFeedback({ success: res.success, message: res.message || res.error || "" });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.success
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
              : "bg-rose-950/40 border-rose-500/30 text-rose-400"
          }`}
        >
          {feedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Platform Brand Name</label>
          <input
            type="text"
            required
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Platform Support Email</label>
          <input
            type="email"
            required
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Default Timezone</label>
          <input
            type="text"
            required
            value={defaultTimezone}
            onChange={(e) => setDefaultTimezone(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Default Operating Currency</label>
          <input
            type="text"
            required
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div>
            <span className="font-semibold text-xs text-white">Enable Open User Registration</span>
            <p className="text-[11px] text-slate-400">Allow new users to sign up via public registration page.</p>
          </div>
          <input
            type="checkbox"
            checked={enableRegistration}
            onChange={(e) => setEnableRegistration(e.target.checked)}
            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-slate-900 border-slate-700 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div>
            <span className="font-semibold text-xs text-white">Platform Maintenance Mode</span>
            <p className="text-[11px] text-slate-400">Pause background job execution and tenant mutations for maintenance.</p>
          </div>
          <input
            type="checkbox"
            checked={maintenanceMode}
            onChange={(e) => setMaintenanceMode(e.target.checked)}
            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 bg-slate-900 border-slate-700 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Save Platform Settings</span>
        </button>
      </div>
    </form>
  );
}
