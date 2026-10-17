"use client";

import React, { useActionState } from "react";
import { updateBusinessSettingsAction, ActionResult } from "@/modules/core-tenancy/actions/business.actions";
import { Building2, Settings, Coins, MapPin, Loader2, Check } from "lucide-react";

interface SettingsFormProps {
  business: {
    id: string;
    name: string;
    slug: string;
    settings: {
      businessType: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      address: string | null;
      timezone: string;
      currency: string;
      expenseApprovalThreshold: string | number | { toString(): string };
      defaultReservePercentage: string | number | { toString(): string };
      autoDeductInventory: boolean;
    } | null;
  };
}

const initialState: ActionResult = { success: false };

export function SettingsForm({ business }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateBusinessSettingsAction, initialState);
  const settings = business.settings;

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Business settings updated successfully.</span>
        </div>
      )}

      {/* Basic Profile */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <Building2 className="w-4 h-4" />
          <span>Business Profile</span>
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
              defaultValue={business.name}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              URL Identifier Slug <span className="text-slate-600">(Immutable)</span>
            </label>
            <input
              type="text"
              disabled
              value={business.slug}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-500 text-xs font-mono cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="businessType" className="block text-xs font-medium text-slate-300 mb-1.5">
              Industry / Business Type
            </label>
            <input
              type="text"
              id="businessType"
              name="businessType"
              defaultValue={settings?.businessType || ""}
              placeholder="e.g. Mushroom Cultivation"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="timezone" className="block text-xs font-medium text-slate-300 mb-1.5">
              Operating Timezone
            </label>
            <input
              type="text"
              id="timezone"
              name="timezone"
              defaultValue={settings?.timezone || "Asia/Colombo"}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          <span>Contact & Operating Address</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactEmail" className="block text-xs font-medium text-slate-300 mb-1.5">
              Contact Email
            </label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              defaultValue={settings?.contactEmail || ""}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="contactPhone" className="block text-xs font-medium text-slate-300 mb-1.5">
              Contact Phone
            </label>
            <input
              type="tel"
              id="contactPhone"
              name="contactPhone"
              defaultValue={settings?.contactPhone || ""}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-xs font-medium text-slate-300 mb-1.5">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={settings?.address || ""}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Financial & Operational Parameters */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
          <Coins className="w-4 h-4" />
          <span>Financial Rules & Thresholds</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="currency" className="block text-xs font-medium text-slate-300 mb-1.5">
              Currency
            </label>
            <input
              type="text"
              id="currency"
              name="currency"
              maxLength={3}
              defaultValue={settings?.currency || "LKR"}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="expenseApprovalThreshold" className="block text-xs font-medium text-slate-300 mb-1.5">
              Expense Approval Threshold
            </label>
            <input
              type="number"
              step="0.01"
              id="expenseApprovalThreshold"
              name="expenseApprovalThreshold"
              defaultValue={settings?.expenseApprovalThreshold?.toString() || "500"}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="defaultReservePercentage" className="block text-xs font-medium text-slate-300 mb-1.5">
              Default Reserve Percentage (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              id="defaultReservePercentage"
              name="defaultReservePercentage"
              defaultValue={settings?.defaultReservePercentage?.toString() || "20"}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="autoDeductInventory"
              name="autoDeductInventory"
              defaultChecked={settings?.autoDeductInventory ?? true}
              className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="autoDeductInventory" className="text-xs text-slate-300">
              Automatically deduct inventory on confirmed customer sales
            </label>
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <span>Save Settings</span>
          )}
        </button>
      </div>
    </form>
  );
}
