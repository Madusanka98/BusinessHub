"use client";

import React, { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createBusinessAction, ActionResult } from "@/modules/core-tenancy/actions/business.actions";
import { Building2, Shield, User, Globe, Mail, Phone, MapPin, Loader2, CheckCircle2 } from "lucide-react";

const initialState: ActionResult<{ businessId: string; slug: string }> = {
  success: false,
};

export function CreateBusinessForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createBusinessAction, initialState);

  React.useEffect(() => {
    if (state.success && state.data) {
      router.push(`/businesses`);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          {state.error}
        </div>
      )}

      {/* Section 1: Business Identity */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <Building2 className="w-4 h-4" />
          <span>Organization Identity</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-slate-300 mb-1.5">
              Business Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="e.g. Green Valley Farm"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {state.fieldErrors?.name && (
              <p className="text-[11px] text-rose-400 mt-1">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="slug" className="block text-xs font-medium text-slate-300 mb-1.5">
              Unique URL Slug <span className="text-slate-500">(Optional)</span>
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              placeholder="e.g. green-valley-farm"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
            />
            {state.fieldErrors?.slug && (
              <p className="text-[11px] text-rose-400 mt-1">{state.fieldErrors.slug[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="businessType" className="block text-xs font-medium text-slate-300 mb-1.5">
              Industry / Business Type
            </label>
            <input
              type="text"
              id="businessType"
              name="businessType"
              placeholder="e.g. Mushroom Cultivation & Agriculture"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-xs font-medium text-slate-300 mb-1.5">
              Currency Code
            </label>
            <select
              id="currency"
              name="currency"
              defaultValue="LKR"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="LKR">LKR - Sri Lankan Rupee</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Initial Owner Assignment */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <Shield className="w-4 h-4" />
          <span>Initial Owner Assignment</span>
        </h3>
        <p className="text-xs text-slate-400">
          The designated primary owner will receive an invitation or immediate ownership privileges.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="initialOwnerEmail" className="block text-xs font-medium text-slate-300 mb-1.5">
              Owner Email Address <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              id="initialOwnerEmail"
              name="initialOwnerEmail"
              required
              placeholder="owner@domain.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {state.fieldErrors?.initialOwnerEmail && (
              <p className="text-[11px] text-rose-400 mt-1">{state.fieldErrors.initialOwnerEmail[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="initialOwnerFullName" className="block text-xs font-medium text-slate-300 mb-1.5">
              Owner Full Name <span className="text-slate-500">(If new account)</span>
            </label>
            <input
              type="text"
              id="initialOwnerFullName"
              name="initialOwnerFullName"
              placeholder="e.g. John Doe"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Contact & Operational Details */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          <span>Contact & Location</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactEmail" className="block text-xs font-medium text-slate-300 mb-1.5">
              Business Contact Email
            </label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              placeholder="info@business.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="contactPhone" className="block text-xs font-medium text-slate-300 mb-1.5">
              Business Contact Phone
            </label>
            <input
              type="tel"
              id="contactPhone"
              name="contactPhone"
              placeholder="+94 77 123 4567"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-xs font-medium text-slate-300 mb-1.5">
              Physical Operating Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={2}
              placeholder="Farm or office address..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Provisioning Tenant...</span>
            </>
          ) : (
            <span>Create Business Tenant</span>
          )}
        </button>
      </div>
    </form>
  );
}
