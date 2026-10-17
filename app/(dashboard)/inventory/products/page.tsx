import React from "react";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/tenant/permissions";
import { getProducts } from "@/modules/commerce/services/product.service";
import { InventoryNav } from "../inventory-nav";
import { ProductTable } from "./product-table";
import { Package, ShieldAlert } from "lucide-react";

export default async function ProductsPage() {
  const context = await tryGetTenantContext();

  if (!context) {
    redirect("/businesses");
  }

  const canView = hasPermission(context.role, "inventory:products:view");
  if (!canView) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Your role (<strong className="text-emerald-400">{context.role}</strong>) does not have authorization to view the product catalog.
        </p>
      </div>
    );
  }

  const canManage = hasPermission(context.role, "inventory:products:manage");
  const data = await getProducts(context.businessId, { limit: 100 });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Package className="w-6 h-6 text-emerald-400" />
          <span>Product Catalog & Pricing</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage tenant-isolated goods, cost tracking, selling prices, and reorder levels.
        </p>
      </div>

      <InventoryNav />

      <ProductTable products={data.products} canManage={canManage} />
    </div>
  );
}
