"use client";

import React, { useState, useTransition } from "react";
import { updateNotificationPreferencesAction } from "@/modules/reports/actions/reports.actions";
import { Bell, CheckCircle2, AlertCircle, Loader2, Mail, Shield } from "lucide-react";

interface NotificationPreferencesClientProps {
  preferences: {
    emailNotifications: boolean;
    lowStockAlerts: boolean;
    productionPhaseAlerts: boolean;
    weeklySummary: boolean;
  };
}

export function NotificationPreferencesClient({ preferences }: NotificationPreferencesClientProps) {
  const [emailNotifications, setEmailNotifications] = useState(preferences.emailNotifications);
  const [lowStockAlerts, setLowStockAlerts] = useState(preferences.lowStockAlerts);
  const [productionPhaseAlerts, setProductionPhaseAlerts] = useState(preferences.productionPhaseAlerts);
  const [weeklySummary, setWeeklySummary] = useState(preferences.weeklySummary);

  const [isSaving, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData();
    fd.append("emailNotifications", emailNotifications ? "true" : "false");
    fd.append("lowStockAlerts", lowStockAlerts ? "true" : "false");
    fd.append("productionPhaseAlerts", productionPhaseAlerts ? "true" : "false");
    fd.append("weeklySummary", weeklySummary ? "true" : "false");

    startTransition(async () => {
      const res = await updateNotificationPreferencesAction(null, fd);
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

      <div className="space-y-4">
        {/* Master Email Notifications Toggle */}
        <div className="flex items-start justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-sm text-white">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Email Notifications</span>
            </div>
            <p className="text-xs text-slate-400">
              Receive platform notifications and operational summaries at your registered account email.
            </p>
          </div>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
          />
        </div>

        {/* Low Stock Alerts */}
        <div className="flex items-start justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="space-y-1">
            <span className="font-semibold text-sm text-white">Low-Stock & Reorder Alerts</span>
            <p className="text-xs text-slate-400">
              Get notified when inventory counts fall below defined product reorder safety levels.
            </p>
          </div>
          <input
            type="checkbox"
            disabled={!emailNotifications}
            checked={lowStockAlerts}
            onChange={(e) => setLowStockAlerts(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700 disabled:opacity-40 cursor-pointer"
          />
        </div>

        {/* Production Phase Alerts */}
        <div className="flex items-start justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="space-y-1">
            <span className="font-semibold text-sm text-white">Production Phase Transitions</span>
            <p className="text-xs text-slate-400">
              Receive updates when mushroom cultivation batches transition between incubation, fruiting, or harvest.
            </p>
          </div>
          <input
            type="checkbox"
            disabled={!emailNotifications}
            checked={productionPhaseAlerts}
            onChange={(e) => setProductionPhaseAlerts(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700 disabled:opacity-40 cursor-pointer"
          />
        </div>

        {/* Weekly Summary */}
        <div className="flex items-start justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="space-y-1">
            <span className="font-semibold text-sm text-white">Weekly Executive Digest</span>
            <p className="text-xs text-slate-400">
              Receive an automated weekly executive digest of sales volume, net profit, and inventory valuation.
            </p>
          </div>
          <input
            type="checkbox"
            disabled={!emailNotifications}
            checked={weeklySummary}
            onChange={(e) => setWeeklySummary(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700 disabled:opacity-40 cursor-pointer"
          />
        </div>

        {/* Security Notification Notice */}
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p>
            Security-critical notifications (invitations, role adjustments, password resets, and business suspensions)
            are mandatory and cannot be disabled.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Save Preferences</span>
        </button>
      </div>
    </form>
  );
}
