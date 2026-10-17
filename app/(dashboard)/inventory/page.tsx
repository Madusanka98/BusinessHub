import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/tenant/permissions";
import { getInventorySummary, getStockMovements } from "@/modules/commerce/services/stock.service";
import { getProducts } from "@/modules/commerce/services/product.service";
import { InventoryNav } from "./inventory-nav";
import {
  Package,
  Boxes,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ArrowLeftRight,
  TrendingDown,
  PlusCircle,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";

export default async function InventoryOverviewPage() {
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
          Your role (<strong className="text-emerald-400">{context.role}</strong>) does not have authorization to view inventory catalogs or stock balances.
        </p>
      </div>
    );
  }

  const [summary, lowStockData, recentMovements] = await Promise.all([
    getInventorySummary(context.businessId),
    getProducts(context.businessId, { lowStockOnly: true, limit: 5 }),
    getStockMovements(context.businessId, { limit: 5 }),
  ]);

  return (
    <div className="space-y-8">
      {/* Module Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Boxes className="w-6 h-6 text-emerald-400" />
          <span>Inventory, Sales & Purchasing</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Auditable stock ledgers, atomic movement balance tracking, and integrated commercial operations.
        </p>
      </div>

      {/* Navigation Tabs */}
      <InventoryNav />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Total Products</span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {summary.totalProducts}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">Active catalog items</div>
        </div>

        {/* Total Inventory Valuation */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Inventory Valuation</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            LKR {summary.totalInventoryValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-400 mt-2">Asset holding value at weighted cost</div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Low Stock Alerts</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400">
            {summary.lowStockCount}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-2">Below reorder threshold</div>
        </div>

        {/* Out of Stock Items */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Out of Stock</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-400">
            {summary.outOfStockCount}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-2">Zero balance items</div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Quick Operations</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/inventory/products"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
          <Link
            href="/inventory/purchases"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>Create Purchase Order</span>
          </Link>
          <Link
            href="/inventory/sales"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            <span>Create Sales Order</span>
          </Link>
          <Link
            href="/inventory/movements"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <ArrowLeftRight className="w-4 h-4 text-amber-400" />
            <span>Stock Adjustment</span>
          </Link>
        </div>
      </div>

      {/* Grid: Low Stock Warnings & Recent Stock Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Low Stock Reorder Alerts</span>
            </h3>
            <Link
              href="/inventory/products"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {lowStockData.products.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              All active items have sufficient stock levels.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {lowStockData.products.map((item) => {
                const stock = Number(item.currentStock);
                const threshold = Number(item.reorderThreshold);
                const isOut = stock <= 0;

                return (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">{item.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">SKU: {item.sku}</div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isOut
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {stock.toFixed(3)} / {threshold.toFixed(3)} {item.unitOfMeasure}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Stock Movements */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
              <span>Recent Stock Movements</span>
            </h3>
            <Link
              href="/inventory/movements"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
            >
              <span>View History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentMovements.movements.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentMovements.movements.map((m) => {
                const qty = Number(m.quantity);
                const isPositive = qty > 0;

                return (
                  <div key={m.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">{m.product.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {m.type.replace(/_/g, " ")} • {new Date(m.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-xs font-mono font-bold ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? `+${qty.toFixed(3)}` : qty.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Bal: {Number(m.balanceAfter).toFixed(3)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
