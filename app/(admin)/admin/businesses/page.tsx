import React from "react";
import { getPlatformBusinesses } from "@/modules/reports/services/saas-admin.service";
import { BusinessStatusClient } from "./business-status-client";
import { Building2, Search, Filter } from "lucide-react";
import { BusinessStatus } from "@prisma/client";

interface AdminBusinessesPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
}

export default async function AdminBusinessesPage(props: AdminBusinessesPageProps) {
  const searchParams = await props.searchParams;
  const search = searchParams.search;
  const status = searchParams.status as BusinessStatus | undefined;

  const result = await getPlatformBusinesses({
    search,
    status: status && Object.values(BusinessStatus).includes(status) ? status : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" />
            <span>Organization Management</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Global directory of all business tenants, operational status, and member counts.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <form method="GET" className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="search"
            defaultValue={search || ""}
            placeholder="Search by organization name or slug..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          name="status"
          defaultValue={status || ""}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Businesses Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Organization Name</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Owners</th>
                <th className="py-3 px-4 text-center">Total Members</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {result.businesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No organizations match the filter criteria.
                  </td>
                </tr>
              ) : (
                result.businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-white">{b.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{b.slug}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          b.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : b.status === "SUSPENDED"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">{b.activeOwnersCount} / {b.maxOwners}</td>
                    <td className="py-3 px-4 text-center text-slate-400">{b._count.memberships}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <BusinessStatusClient
                        businessId={b.id}
                        businessName={b.name}
                        currentStatus={b.status}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
