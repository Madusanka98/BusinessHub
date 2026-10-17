"use client";

import React, { useTransition } from "react";
import { switchTenantAction } from "@/modules/core-tenancy/actions/auth.actions";
import { Building2, ChevronDown, Check, Loader2 } from "lucide-react";

export interface AuthorizedBusiness {
  businessId: string;
  businessName: string;
  businessSlug: string;
  role: string;
}

interface TenantSwitcherProps {
  currentBusinessId: string | null;
  currentBusinessName: string | null;
  currentRole: string | null;
  businesses: AuthorizedBusiness[];
}

export function TenantSwitcher({
  currentBusinessId,
  currentBusinessName,
  currentRole,
  businesses,
}: TenantSwitcherProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSelectBusiness = (targetBusinessId: string) => {
    if (targetBusinessId === currentBusinessId) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    startTransition(async () => {
      await switchTenantAction(targetBusinessId);
    });
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={isPending}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm font-medium text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer"
      >
        <Building2 className="w-4 h-4 text-emerald-400" />
        <span className="max-w-[150px] truncate">
          {currentBusinessName || "Select Business"}
        </span>
        {currentRole && (
          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {currentRole}
          </span>
        )}
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 ml-1" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1.5 z-50 focus:outline-none">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
              Switch Business Workspace
            </div>
            {businesses.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">No organizations found</div>
            ) : (
              businesses.map((b) => {
                const isSelected = b.businessId === currentBusinessId;
                return (
                  <button
                    key={b.businessId}
                    type="button"
                    onClick={() => handleSelectBusiness(b.businessId)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      isSelected ? "text-emerald-400 font-medium bg-emerald-500/5" : "text-slate-300"
                    }`}
                  >
                    <div className="truncate mr-2">
                      <p className="truncate font-medium">{b.businessName}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{b.role}</p>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
