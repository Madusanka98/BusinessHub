import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { getUserAuthorizedBusinesses } from "@/modules/core-tenancy/services/tenant.service";
import { NavHeader } from "@/components/shared/nav-header";
import { Building2, PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || !session.userId) {
    redirect("/login");
  }

  const authorizedBusinesses = await getUserAuthorizedBusinesses(session.userId);
  const tenantContext = await tryGetTenantContext();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <NavHeader
        user={{
          id: session.userId,
          email: session.email,
          fullName: session.fullName,
          isSuperAdmin: session.isSuperAdmin,
        }}
        currentBusiness={
          tenantContext
            ? {
                id: tenantContext.businessId,
                name: tenantContext.businessName,
                role: tenantContext.role,
              }
            : null
        }
        businesses={authorizedBusinesses}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {authorizedBusinesses.length === 0 && !session.isSuperAdmin ? (
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Active Business Membership</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              You are currently not associated with any active business organizations. Please check your inbox for an invitation link or contact your business administrator.
            </p>
          </div>
        ) : authorizedBusinesses.length === 0 && session.isSuperAdmin ? (
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <Building2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Welcome, Super Admin</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              No business organizations have been created yet on the platform. Start by provisioning the first business tenant.
            </p>
            <Link
              href="/businesses/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-emerald-900/40"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Business</span>
            </Link>
          </div>
        ) : (
          children
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        BusinessHub SaaS &bull; Enterprise Tenant Isolation &bull; &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
