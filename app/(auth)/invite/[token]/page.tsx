import React from "react";
import Link from "next/link";
import { getInvitationByToken } from "@/modules/core-tenancy/services/invitation.service";
import { InviteForm } from "./invite-form";
import { AlertCircle, Building2 } from "lucide-react";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const verification = await getInvitationByToken(token);

  if (!verification.valid || !verification.invitation) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-semibold text-white">Invitation Unavailable</h1>
        <p className="text-sm text-slate-400 mt-2 mb-6">{verification.error}</p>
        <Link
          href="/login"
          className="inline-flex py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  const { invitation } = verification;

  return (
    <div>
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-3 border border-emerald-500/20">
          <Building2 className="w-3.5 h-3.5" />
          <span>{invitation.businessName}</span>
        </div>
        <h1 className="text-xl font-semibold text-white">Accept Invitation</h1>
        <p className="text-sm text-slate-400 mt-1">
          You have been invited to join as <span className="font-medium text-slate-200">{invitation.role}</span>.
        </p>
      </div>

      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 mb-5 text-xs text-slate-400 flex justify-between items-center">
        <span>Invited Email:</span>
        <span className="font-mono text-slate-200 font-medium">{invitation.email}</span>
      </div>

      <InviteForm
        token={token}
        email={invitation.email}
        hasExistingAccount={invitation.hasExistingAccount}
      />
    </div>
  );
}
