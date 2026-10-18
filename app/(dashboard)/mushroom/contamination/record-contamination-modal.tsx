"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordContaminationAction } from "@/modules/mushroom/actions/mushroom.actions";
import { BatchPhase, ContaminationReason } from "@prisma/client";
import { PlusCircle, Loader2, X, AlertTriangle } from "lucide-react";

interface ActiveBatchOption {
  id: string;
  batchCode: string;
  strainName: string;
  currentPhase: BatchPhase;
  viableBagsCount: number;
}

interface RecordContaminationModalProps {
  activeBatches: ActiveBatchOption[];
}

export function RecordContaminationModal({ activeBatches }: RecordContaminationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(activeBatches[0]?.id || "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const selectedBatch = activeBatches.find((b) => b.id === selectedBatchId) || activeBatches[0];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await recordContaminationAction(null, formData);
      if (!result.success) {
        setError(result.error || "Failed to log contamination.");
      } else {
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-900/30"
      >
        <PlusCircle className="w-4 h-4" />
        <span>Record Contamination</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Record Contamination & Waste</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Log defective, molded or discarded bags to atomically update viable batch inventory.
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {error}
              </div>
            )}

            {activeBatches.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No active production batches found. Please create an active batch first before recording waste.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Select Active Batch *
                  </label>
                  <select
                    name="batchId"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    {activeBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchCode} — {b.strainName} ({b.viableBagsCount} viable bags, Phase: {b.currentPhase})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Phase Detected *
                    </label>
                    <select
                      name="phaseDetected"
                      defaultValue={selectedBatch?.currentPhase || BatchPhase.INCUBATION}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      {Object.values(BatchPhase).map((phase) => (
                        <option key={phase} value={phase}>
                          {phase}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Discarded Bags *
                    </label>
                    <input
                      type="number"
                      name="discardedBagsCount"
                      min="1"
                      max={selectedBatch?.viableBagsCount || 10000}
                      defaultValue="1"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                    {selectedBatch && (
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Max viable: {selectedBatch.viableBagsCount} bags
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Pathogen / Failure Reason *
                  </label>
                  <select
                    name="reason"
                    defaultValue={ContaminationReason.GREEN_MOLD_TRICHODERMA}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    {Object.values(ContaminationReason).map((reason) => (
                      <option key={reason} value={reason}>
                        {reason.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Observations & Action Taken
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Details of contamination location, symptom, or disposal method..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
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
                    <span>Record Loss</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
