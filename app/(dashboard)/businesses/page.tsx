import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getUserAuthorizedBusinesses } from "@/modules/core-tenancy/services/tenant.service";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { switchBusinessContextAction } from "@/modules/core-tenancy/actions/business.actions";
import { Building2, PlusCircle, Check, ArrowRight, ShieldCheck } from "lucide-react";

export default async function BusinessesPage() {
  const session = await getSession();

  if (!session || !session.userId) {
    redirect("/login");
  }

  const businesses = await getUserAuthorizedBusinesses(session.userId);
  const currentContext = await tryGetTenantContext();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Your Businesses</h1>
          <p className="text-xs text-slate-400 mt-1">
            Organizations where you hold active membership credentials.
          </p>
        </div>

        {session.isSuperAdmin && (
          <Link
            href="/businesses/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/40 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Provision New Business</span>
          </Link>
        )}
      </div>

      {businesses.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Organizations Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You do not currently belong to any businesses. Ask an owner to invite you or create a new organization if you hold administrative rights.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {businesses.map((b) => {
            const isCurrent = currentContext?.businessId === b.businessId;

            return (
              <div
                key={b.businessId}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCurrent
                    ? "bg-slate-900 border-emerald-500/30 shadow-lg shadow-emerald-950/20"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-semibold text-white">{b.businessName}</h3>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                      {b.role}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3 h-3" />
                        Active Workspace
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Slug: <code className="text-slate-300 font-mono">{b.businessSlug}</code> &bull; Joined: {new Date(b.joinedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isCurrent ? (
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                    >
                      <span>Go to Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <form
                      action={async () => {
                        "use server";
                        await switchBusinessContextAction(b.businessId);
                        redirect("/");
                      }}
                    >
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
                      >
                        <span>Switch Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
