"use client";

import React, { useActionState } from "react";
import { acceptInvitationAction, FormActionState } from "@/modules/core-tenancy/actions/auth.actions";
import { CheckCircle2, UserPlus, Lock, Loader2 } from "lucide-react";

interface InviteFormProps {
  token: string;
  email: string;
  hasExistingAccount: boolean;
}

export function InviteForm({ token, email, hasExistingAccount }: InviteFormProps) {
  const [state, formAction, isPending] = useActionState<FormActionState, FormData>(
    acceptInvitationAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state?.error && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"
        >
          {state.error}
        </div>
      )}

      {!hasExistingAccount && (
        <div>
          <label htmlFor="fullName" className="block text-xs font-medium text-slate-300 mb-1.5">
            Your Full Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            placeholder="e.g. Kasun Bandara"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
          />
        </div>
      )}

      {!hasExistingAccount ? (
        <>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1.5">
              Create Password (min. 10 chars, uppercase, lowercase, number, symbol)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs mb-4">
          <CheckCircle2 className="w-4 h-4 inline-block mr-1 text-emerald-400" />
          Existing account detected for {email}. Accepting will connect this business to your existing credentials.
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            <span>Accept Invitation & Join Business</span>
          </>
        )}
      </button>
    </form>
  );
}
