"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Package,
  ArrowLeftRight,
  ShoppingBag,
  ShoppingCart,
  Users2,
} from "lucide-react";

export function InventoryNav() {
  const pathname = usePathname();

  const links = [
    { href: "/inventory", label: "Inventory Overview", icon: LayoutGrid, exact: true },
    { href: "/inventory/products", label: "Products & Catalog", icon: Package },
    { href: "/inventory/movements", label: "Stock Movements & Adjust", icon: ArrowLeftRight },
    { href: "/inventory/purchases", label: "Purchases & Influx", icon: ShoppingBag },
    { href: "/inventory/sales", label: "Sales & Invoicing", icon: ShoppingCart },
    { href: "/inventory/contacts", label: "Customers & Suppliers", icon: Users2 },
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
