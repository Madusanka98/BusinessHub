import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertSuperAdmin } from "@/lib/tenant/guards";
import { AdminNav } from "./admin-nav";
import { ShieldCheck } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect("/login");
  }

  try {
    await assertSuperAdmin("superadmin:business:read");
  } catch {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Super Admin Top Warning Bar */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-400 font-semibold flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4" />
        <span>SaaS Super Admin Control Plane &mdash; Privileged Operational Mode</span>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <AdminNav />
        {children}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        BusinessHub SaaS &bull; Platform Management &bull; &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
