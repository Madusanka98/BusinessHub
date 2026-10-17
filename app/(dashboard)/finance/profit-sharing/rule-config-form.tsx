"use client";

import React, { useState, useTransition } from "react";
import { saveProfitSharingRuleAction } from "@/modules/finance/actions/finance.actions";
import { SharingRuleType, LossPolicy } from "@prisma/client";
import { Sliders, Loader2, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { ActiveRuleAllocation } from "@/modules/finance/services/profitSharing.service";

interface RuleConfigFormProps {
  currentRule: {
    id: string | null;
    name: string;
    ruleType: SharingRuleType;
    lossPolicy: LossPolicy;
    version: number;
    allocations: ActiveRuleAllocation[];
  };
}

export function RuleConfigForm({ currentRule }: RuleConfigFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(currentRule.name);
  const [ruleType, setRuleType] = useState<SharingRuleType>(currentRule.ruleType);
  const [lossPolicy, setLossPolicy] = useState<LossPolicy>(currentRule.lossPolicy);
  const [allocations, setAllocations] = useState(
    currentRule.allocations.map((a) => ({
      membershipId: a.membershipId,
      fullName: a.fullName,
      percentage: a.percentage,
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const totalPercentage = allocations.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0);
  const isTotalValid = Math.abs(totalPercentage - 100) <= 0.05;

  const handlePercentageChange = (membershipId: string, val: number) => {
    setAllocations((prev) =>
      prev.map((a) => (a.membershipId === membershipId ? { ...a, percentage: val } : a))
    );
  };

  const handleAutoEqualize = () => {
    const count = allocations.length || 1;
    const base = parseFloat((100 / count).toFixed(2));
    const remainder = parseFloat((100 - base * count).toFixed(2));

    setAllocations((prev) =>
      prev.map((a, idx) => ({
        ...a,
        percentage: idx === 0 ? parseFloat((base + remainder).toFixed(2)) : base,
      }))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTotalValid) {
      setError(`Allocations must sum exactly to 100% (currently ${totalPercentage.toFixed(2)}%).`);
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await saveProfitSharingRuleAction({
        name,
        ruleType,
        lossPolicy,
        allocations: allocations.map((a) => ({
          membershipId: a.membershipId,
          percentage: Number(a.percentage),
        })),
      });

      if (!res.success) {
        setError(res.error || "Failed to update sharing rule.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
        }, 1200);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
      >
        <Sliders className="w-4 h-4 text-emerald-400" />
        <span>Configure Sharing Rule</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Profit & Loss Sharing Rules</h3>
                  <p className="text-xs text-slate-400">Versioned allocation parameters.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Rule updated and versioned successfully!</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Agreement Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. 2026 Core Partner Profit Agreement"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Calculation Model
                  </label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as SharingRuleType)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="CUSTOM_PERCENTAGE">Custom Percentage</option>
                    <option value="EQUAL">Equal Split</option>
                    <option value="OWNERSHIP_PERCENTAGE">Ownership Equity %</option>
                    <option value="CAPITAL_BASED">Capital Investment Ratio</option>
                    <option value="HYBRID_WEIGHTED">Hybrid Weighted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Loss Handling Policy
                  </label>
                  <select
                    value={lossPolicy}
                    onChange={(e) => setLossPolicy(e.target.value as LossPolicy)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="CARRY_FORWARD">Carry Forward to Next Period</option>
                    <option value="ABSORB_FROM_RESERVE">Absorb from Retained Reserve</option>
                    <option value="ALLOCATE_ACCORDING_TO_RULE">Allocate to Partner Capital</option>
                    <option value="HOLD_IN_SUSPENSE">Hold in Suspense Account</option>
                  </select>
                </div>
              </div>

              {/* Partner Allocation Percentages */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Partner Allocation Breakdown
                  </span>
                  <button
                    type="button"
                    onClick={handleAutoEqualize}
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    Equalize Percentages
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {allocations.map((a) => (
                    <div key={a.membershipId} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-xs font-medium text-slate-200 truncate max-w-[220px]">
                        {a.fullName}
                      </span>
                      <div className="flex items-center gap-1.5 w-28">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={a.percentage}
                          onChange={(e) => handlePercentageChange(a.membershipId, parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-right text-emerald-400 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-mono">%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-400">Total Allocation:</span>
                  <span
                    className={`font-mono font-bold ${
                      isTotalValid ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {totalPercentage.toFixed(2)}% / 100.00%
                  </span>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !isTotalValid}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save Rule</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
