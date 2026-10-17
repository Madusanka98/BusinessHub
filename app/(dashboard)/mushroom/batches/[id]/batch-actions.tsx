"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  advanceBatchPhaseAction,
  cancelBatchAction,
  recordContaminationAction,
} from "@/modules/mushroom/actions/mushroom.actions";
import { BatchPhase, ContaminationReason } from "@prisma/client";
import { Loader2, ArrowRightCircle, AlertTriangle, XCircle, X } from "lucide-react";

interface BatchActionsProps {
  batchId: string;
  currentPhase: BatchPhase;
  viableBagsCount: number;
  status: string;
  chambers: Array<{ id: string; name: string }>;
}

export function BatchActions({
  batchId,
  currentPhase,
  viableBagsCount,
  status,
  chambers,
}: BatchActionsProps) {
  const [modalType, setModalType] = useState<"advance" | "waste" | "cancel" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (status !== "ACTIVE") {
    return null;
  }

  // Determine next legitimate phase
  let nextPhase: BatchPhase | null = null;
  if (currentPhase === BatchPhase.PREPARATION) nextPhase = BatchPhase.STERILIZATION;
  else if (currentPhase === BatchPhase.STERILIZATION) nextPhase = BatchPhase.INOCULATION;
  else if (currentPhase === BatchPhase.INOCULATION) nextPhase = BatchPhase.INCUBATION;
  else if (currentPhase === BatchPhase.INCUBATION) nextPhase = BatchPhase.FRUITING;
  else if (currentPhase === BatchPhase.FRUITING) nextPhase = BatchPhase.COMPLETED;

  const handleAdvanceSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("batchId", batchId);
    if (nextPhase) formData.set("targetPhase", nextPhase);

    startTransition(async () => {
      const result = await advanceBatchPhaseAction(null, formData);
      if (!result.success) {
        setError(result.error || "Failed to advance batch phase.");
      } else {
        setModalType(null);
        router.refresh();
      }
    });
  };

  const handleWasteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("batchId", batchId);
    formData.set("phaseDetected", currentPhase);

    startTransition(async () => {
      const result = await recordContaminationAction(null, formData);
      if (!result.success) {
        setError(result.error || "Failed to log contamination.");
      } else {
        setModalType(null);
        router.refresh();
      }
    });
  };

  const handleCancelSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("batchId", batchId);

    startTransition(async () => {
      const result = await cancelBatchAction(null, formData);
      if (!result.success) {
        setError(result.error || "Failed to cancel batch.");
      } else {
        setModalType(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {nextPhase && (
        <button
          onClick={() => setModalType("advance")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-900/30 cursor-pointer"
        >
          <ArrowRightCircle className="w-3.5 h-3.5" />
          <span>Advance to {nextPhase}</span>
        </button>
      )}

      <button
        onClick={() => setModalType("waste")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Log Waste</span>
      </button>

      <button
        onClick={() => setModalType("cancel")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
      >
        <XCircle className="w-3.5 h-3.5" />
        <span>Cancel</span>
      </button>

      {/* Advance Modal */}
      {modalType === "advance" && nextPhase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1">
              Advance Phase: {currentPhase} &rarr; {nextPhase}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter environmental measurements and stage verification parameters.
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleAdvanceSubmit} className="space-y-3">
              {nextPhase === BatchPhase.FRUITING && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Assign Fruiting Chamber
                  </label>
                  <select
                    name="chamberId"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Keep current chamber</option>
                    {chambers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="temperature"
                    placeholder="e.g. 23.5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Humidity (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="humidity"
                    min="0"
                    max="100"
                    placeholder="e.g. 90"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">CO2 (PPM)</label>
                  <input
                    type="number"
                    name="co2Ppm"
                    min="0"
                    placeholder="e.g. 800"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phase Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Environmental readings or observations..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Advance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Waste Modal */}
      {modalType === "waste" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1">Log Contamination / Loss</h2>
            <p className="text-xs text-slate-400 mb-4">
              Deduct contaminated or damaged bags from the active viable count ({viableBagsCount} remaining).
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleWasteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Discarded Bags Count *
                </label>
                <input
                  type="number"
                  name="discardedBagsCount"
                  min="1"
                  max={viableBagsCount}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contamination Reason *</label>
                <select
                  name="reason"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {Object.values(ContaminationReason).map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Loss Observations</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Describe location, symptoms, pathogen identification..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Record Discard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {modalType === "cancel" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1">Cancel Production Batch</h2>
            <p className="text-xs text-slate-400 mb-4">
              Permanently cancel this batch. This action cannot be reversed.
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Reason for Cancellation *</label>
                <input
                  type="text"
                  name="reason"
                  required
                  placeholder="e.g. Severe contamination, equipment failure"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Keep Active
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Cancel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
