"use client";

import React, { useTransition, useState } from "react";
import { approveTransactionAction } from "@/modules/finance/actions/finance.actions";
import { Check, Loader2 } from "lucide-react";

interface TransactionApprovalBtnProps {
  transactionId: string;
  canApprove: boolean;
}

export function TransactionApprovalBtn({ transactionId, canApprove }: TransactionApprovalBtnProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canApprove) return null;

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const res = await approveTransactionAction(transactionId);
      if (!res.success) {
        setError(res.error || "Failed to approve.");
      }
    });
  };

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {error && <span className="text-[10px] text-rose-400">{error}</span>}
      <button
        type="button"
        onClick={handleApprove}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        <span>Approve Expense</span>
      </button>
    </div>
  );
}
