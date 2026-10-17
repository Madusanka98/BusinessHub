"use client";

import React, { useTransition, useState } from "react";
import { revokeInvitationAction } from "@/modules/core-tenancy/actions/business.actions";
import { XCircle, Loader2 } from "lucide-react";

interface InvitationActionsProps {
  invitationId: string;
  email: string;
  canRevoke: boolean;
}

export function InvitationActions({ invitationId, email, canRevoke }: InvitationActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canRevoke) return null;

  const handleRevoke = () => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}? This single-use link will be immediately invalidated and any reserved owner quota freed.`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await revokeInvitationAction(invitationId);
      if (!res.success) {
        setError(res.error || "Failed to revoke invitation.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      {error && <span className="text-[10px] text-rose-400">{error}</span>}
      <button
        type="button"
        onClick={handleRevoke}
        disabled={isPending}
        title="Revoke Invitation"
        className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 hover:underline transition-colors cursor-pointer disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
        <span>Revoke</span>
      </button>
    </div>
  );
}
