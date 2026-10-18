"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-context";
import {
  LayoutGrid,
  Layers,
  Sprout,
  AlertTriangle,
  Flame,
  Dna,
} from "lucide-react";

export function MushroomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const links = [
    { href: "/mushroom", label: t("mushroom.nav.overview", "Production Overview"), icon: LayoutGrid, exact: true },
    { href: "/mushroom/batches", label: t("mushroom.nav.batches", "Production Batches"), icon: Layers },
    { href: "/mushroom/harvests", label: t("mushroom.nav.harvests", "Harvest Flushes"), icon: Sprout },
    { href: "/mushroom/contamination", label: t("mushroom.nav.contamination", "Contamination & Waste"), icon: AlertTriangle },
    { href: "/mushroom/drying", label: t("mushroom.nav.drying", "Drying & Processing"), icon: Flame },
    { href: "/mushroom/strains", label: t("mushroom.nav.strains", "Strains & Substrates"), icon: Dna },
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
