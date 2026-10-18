"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-context";
import { Coins, Receipt, Wallet, Landmark, PieChart } from "lucide-react";

export function FinanceNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const links = [
    { href: "/finance", label: t("finance.nav.overview", "Financial Overview"), icon: Coins, exact: true },
    { href: "/finance/transactions", label: t("finance.nav.transactions", "Income & Expenses"), icon: Receipt },
    { href: "/finance/capital", label: t("finance.nav.capital", "Capital & Withdrawals"), icon: Wallet },
    { href: "/finance/loans", label: t("finance.nav.loans", "Partner & Business Loans"), icon: Landmark },
    { href: "/finance/profit-sharing", label: t("finance.nav.profitSharing", "Profit Sharing & Periods"), icon: PieChart },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              isActive
                ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
