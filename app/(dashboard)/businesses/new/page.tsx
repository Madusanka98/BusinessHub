import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CreateBusinessForm } from "./create-business-form";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default async function NewBusinessPage() {
  const session = await getSession();

  if (!session || !session.userId) {
    redirect("/login");
  }

  if (!session.isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Only Platform Super Administrators are authorized to provision new business organizations and assign initial owners.
        </p>
        <Link
          href="/businesses"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Businesses</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Provision New Business</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create an isolated multi-tenant workspace and assign the primary owner.
          </p>
        </div>
        <Link
          href="/businesses"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </Link>
      </div>

      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <CreateBusinessForm />
      </div>
    </div>
  );
}
