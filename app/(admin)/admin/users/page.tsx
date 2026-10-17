import React from "react";
import { getPlatformUsers } from "@/modules/reports/services/saas-admin.service";
import { Users, Search, ShieldCheck } from "lucide-react";

interface AdminUsersPageProps {
  searchParams: Promise<{
    search?: string;
  }>;
}

export default async function AdminUsersPage(props: AdminUsersPageProps) {
  const searchParams = await props.searchParams;
  const search = searchParams.search;

  const result = await getPlatformUsers({ search });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-400" />
          <span>Registered Platform Users</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Global directory of all user accounts, organizational memberships, and administrative privileges.
        </p>
      </div>

      {/* Search Bar */}
      <form method="GET" className="flex items-center gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="search"
            defaultValue={search || ""}
            placeholder="Search by full name or email address..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          Search
        </button>
      </form>

      {/* Users Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Platform Role</th>
                <th className="py-3 px-4 text-center">Business Memberships</th>
                <th className="py-3 px-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {result.users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No registered users match the search criteria.
                  </td>
                </tr>
              ) : (
                result.users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-white">{u.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                    <td className="py-3 px-4 text-center">
                      {u.isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          Super Admin
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-400 bg-slate-800">
                          Standard User
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-medium">{u._count.memberships} organizations</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
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
