import React from "react";
import Link from "next/link";
import { verifyPasswordResetToken } from "@/modules/core-tenancy/services/auth.service";
import { ResetPasswordForm } from "./reset-password-form";
import { AlertCircle, ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ResetPasswordPage({ params }: PageProps) {
  const { token } = await params;
  const tokenCheck = await verifyPasswordResetToken(token);

  if (!tokenCheck.valid) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Reset Link Invalid or Expired</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          {tokenCheck.error || "This password reset link is invalid or has expired. Password reset links are valid for 1 hour."}
        </p>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Request a New Reset Link</span>
          </Link>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
