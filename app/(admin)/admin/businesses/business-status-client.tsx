"use client";

import React, { useState, useTransition } from "react";
import { updateBusinessStatusByAdminAction } from "@/modules/reports/actions/reports.actions";
import { BusinessStatus } from "@prisma/client";
import { Loader2, ShieldAlert, CheckCircle, Archive, AlertTriangle } from "lucide-react";

interface BusinessStatusClientProps {
  businessId: string;
  businessName: string;
  currentStatus: BusinessStatus;
}

export function BusinessStatusClient({
  businessId,
  businessName,
  currentStatus,
}: BusinessStatusClientProps) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<BusinessStatus | null>(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const openAction = (status: BusinessStatus) => {
    setTargetStatus(status);
    setReason("");
    setIsOpenModal(true);
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatus) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.append("businessId", businessId);
      fd.append("status", targetStatus);
      fd.append("reason", reason);

      const res = await updateBusinessStatusByAdminAction(null, fd);
      if (res.success) {
        setIsOpenModal(false);
      } else {
        setMessage(res.error || "Failed to update status.");
      }
    });
  };

  return (
    <div>
      <div className="flex items-center gap-1.5">
        {currentStatus === "ACTIVE" && (
          <button
            onClick={() => openAction(BusinessStatus.SUSPENDED)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors cursor-pointer"
          >
            Suspend
          </button>
        )}

        {currentStatus === "SUSPENDED" && (
          <button
            onClick={() => openAction(BusinessStatus.ACTIVE)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
          >
            Reactivate
          </button>
        )}

        {currentStatus !== "ARCHIVED" && (
          <button
            onClick={() => openAction(BusinessStatus.ARCHIVED)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Archive
          </button>
        )}
      </div>

      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-white">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-base">Confirm Status Change</h3>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to transition organization <strong>{businessName}</strong> to{" "}
              <span className="font-semibold text-amber-400">{targetStatus}</span>?
            </p>

            {message && <div className="text-xs text-rose-400 p-2 bg-rose-950/40 rounded-lg">{message}</div>}

            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Administrative Reason / Justification
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Terms violation review or billing investigation."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Status Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
