import React from "react";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/tenant/permissions";
import { getOrders } from "@/modules/commerce/services/sale.service";
import { getCustomers } from "@/modules/commerce/services/contact.service";
import { getProducts } from "@/modules/commerce/services/product.service";
import { InventoryNav } from "../inventory-nav";
import { SalesTable } from "./sales-table";
import { ShoppingCart, ShieldAlert } from "lucide-react";

export default async function SalesPage() {
  const context = await tryGetTenantContext();

  if (!context) {
    redirect("/businesses");
  }

  const canView = hasPermission(context.role, "sales:orders:view");
  if (!canView) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Your role (<strong className="text-emerald-400">{context.role}</strong>) does not have authorization to view sales orders.
        </p>
      </div>
    );
  }

  const canManage = hasPermission(context.role, "sales:orders:manage");
  const [orderData, customerData, productData] = await Promise.all([
    getOrders(context.businessId, { limit: 100 }),
    getCustomers(context.businessId, { isActive: true, limit: 100 }),
    getProducts(context.businessId, { isActive: true, limit: 200 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-emerald-400" />
          <span>Sales, Invoicing & Dispatches</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Draft sales orders, atomic inventory deduction, walk-in customer support, and printable invoices.
        </p>
      </div>

      <InventoryNav />

      <SalesTable
        orders={orderData.orders}
        customers={customerData.customers}
        products={productData.products}
        canManage={canManage}
        businessName={context.businessName}
      />
    </div>
  );
}
