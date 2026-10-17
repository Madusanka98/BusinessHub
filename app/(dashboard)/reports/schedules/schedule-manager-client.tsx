"use client";

import React, { useState, useTransition } from "react";
import {
  createScheduledReportAction,
  toggleScheduledReportAction,
  deleteScheduledReportAction,
  runScheduledReportNowAction,
} from "@/modules/reports/actions/reports.actions";
import {
  CalendarClock,
  Play,
  Pause,
  Trash2,
  Plus,
  Loader2,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface ScheduledReportRunItem {
  id: string;
  status: string;
  executionDurationMs?: number | null;
  completedAt?: Date | string | null;
  errorMessage?: string | null;
}

interface ScheduledReportItem {
  id: string;
  name: string;
  reportType: string;
  frequency: string;
  timeOfDay: string;
  timezone: string;
  format: string;
  isActive: boolean;
  recipients: string[] | unknown;
  lastRunAt?: Date | string | null;
  nextRunAt?: Date | string | null;
  runs?: ScheduledReportRunItem[];
}

interface ScheduleManagerClientProps {
  schedules: ScheduledReportItem[];
}

export function ScheduleManagerClient({ schedules }: ScheduleManagerClientProps) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isSubmitting, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleToggle = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", id);
      fd.append("isActive", currentActive ? "false" : "true");
      const res = await toggleScheduledReportAction(null, fd);
      setFeedback({ success: res.success, message: res.message || res.error || "" });
    });
  };

  const handleRunNow = (id: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", id);
      const res = await runScheduledReportNowAction(null, fd);
      setFeedback({ success: res.success, message: res.message || res.error || "" });
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this scheduled report?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", id);
      const res = await deleteScheduledReportAction(null, fd);
      setFeedback({ success: res.success, message: res.message || res.error || "" });
    });
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createScheduledReportAction(null, formData);
      if (res.success) {
        setIsOpenModal(false);
        setFeedback({ success: true, message: res.message || "Scheduled report created." });
      } else {
        setFeedback({ success: false, message: res.error || "Failed to create schedule." });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-white">Automated Report Schedules</h2>
          <p className="text-xs text-slate-400">
            Automatically dispatch financial and inventory summaries via email on daily, weekly, or monthly cadences.
          </p>
        </div>

        <button
          onClick={() => setIsOpenModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-emerald-900/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Schedule</span>
        </button>
      </div>

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

      {/* Schedules List */}
      <div className="space-y-4">
        {schedules.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
            <CalendarClock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">No scheduled reports active</p>
            <p className="text-xs text-slate-500 mt-1">
              Create an automated schedule to receive weekly P&L or daily low-stock alerts in your inbox.
            </p>
          </div>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-white">{schedule.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        schedule.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {schedule.isActive ? "ACTIVE" : "PAUSED"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {schedule.reportType.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span>
                      Cadence: <strong className="text-slate-200">{schedule.frequency}</strong> at {schedule.timeOfDay} ({schedule.timezone})
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      {Array.isArray(schedule.recipients) ? schedule.recipients.join(", ") : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunNow(schedule.id)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Execute and send report right now"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Run Now</span>
                  </button>

                  <button
                    onClick={() => handleToggle(schedule.id, schedule.isActive)}
                    disabled={isSubmitting}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors disabled:opacity-50 cursor-pointer"
                    title={schedule.isActive ? "Pause schedule" : "Resume schedule"}
                  >
                    {schedule.isActive ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button
                    onClick={() => handleDelete(schedule.id)}
                    disabled={isSubmitting}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 text-xs transition-colors disabled:opacity-50 cursor-pointer"
                    title="Delete schedule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Execution History Snippet */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span>
                    Last Run: {schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : "Never"}
                  </span>
                  <span>&bull;</span>
                  <span>
                    Next Run: {schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString() : "Not scheduled"}
                  </span>
                </div>

                {schedule.runs && schedule.runs.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Latest execution:</span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        schedule.runs[0].status === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : schedule.runs[0].status === "FAILED"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {schedule.runs[0].status === "SUCCESS" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {schedule.runs[0].status} ({schedule.runs[0].executionDurationMs}ms)
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE MODAL */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create Automated Scheduled Report</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Schedule Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Weekly Executive Financial Summary"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Report Type</label>
                  <select
                    name="reportType"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PROFIT_AND_LOSS">Profit and Loss</option>
                    <option value="SALES_SUMMARY">Sales Summary</option>
                    <option value="PURCHASES_SUMMARY">Purchases Summary</option>
                    <option value="INVENTORY_VALUATION">Inventory Valuation</option>
                    <option value="LOW_STOCK_ALERT">Low-Stock Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Frequency</label>
                  <select
                    name="frequency"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="DAILY">Daily</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Time of Day</label>
                  <input
                    type="time"
                    name="timeOfDay"
                    defaultValue="08:00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Timezone</label>
                  <input
                    type="text"
                    name="timezone"
                    defaultValue="Asia/Colombo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Recipient Emails (comma separated)
                </label>
                <input
                  type="text"
                  name="recipients"
                  required
                  placeholder="finance@company.com, ceo@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
