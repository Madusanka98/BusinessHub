import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-emerald-900/40">
              B
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">BusinessHub</span>
          </div>
          <p className="text-sm text-slate-400">Multi-Tenant Business & Operations SaaS</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {children}
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          &copy; {new Date().getFullYear()} BusinessHub Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
}
