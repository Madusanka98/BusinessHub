"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exportReportCsvAction } from "@/modules/reports/actions/reports.actions";
import {
  Download,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Package,
  ShoppingCart,
  Receipt,
  Scale,
  Loader2,
} from "lucide-react";

interface PnLData {
  period?: {
    startDate: Date | null;
    endDate: Date | null;
  };
  summary: {
    totalRevenue: number;
    totalCostOfGoodsSold: number;
    grossProfit: number;
    totalOperatingExpenses: number;
    netIncome: number;
    operatingMarginPercent: number;
  };
  revenueByCategory?: Array<{ category: string; amount: number }>;
  revenueBreakdown?: Array<{ category: string; amount: number }>;
  expensesByCategory?: Array<{ category: string; amount: number }>;
  expenseBreakdown?: Array<{ category: string; amount: number }>;
  transactionCount?: number;
}

interface SalesData {
  summary: {
    totalOrders: number;
    totalSalesVolume: number;
    totalCollected: number;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    orderDate: string | Date;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    itemCount: number;
  }>;
}

interface PurchasesData {
  summary: {
    totalPurchases: number;
    totalPurchasesVolume: number;
    totalPaid: number;
  };
  purchases: Array<{
    id: string;
    purchaseNumber: string;
    supplierName: string;
    purchaseDate: string | Date;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    itemCount: number;
  }>;
}

interface InventoryData {
  totalProducts: number;
  totalStockUnits: number;
  totalCostValuation: number;
  totalRetailValuation: number;
  potentialMargin?: number;
  lowStockCount: number;
  items: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    currentStock: number;
    unitCost: number;
    costValuation: number;
    reorderLevel?: number;
    isLowStock: boolean;
  }>;
}

interface BalancesData {
  totalReceivables: number;
  totalPayables: number;
  netWorkingCapital?: number;
  customers: Array<{
    id: string;
    name: string;
    outstandingBalance: number;
    count?: number;
  }>;
  suppliers: Array<{
    id: string;
    name: string;
    outstandingBalance: number;
    count?: number;
  }>;
}

interface ReportClientViewerProps {
  currentTab: string;
  fromDate?: string;
  toDate?: string;
  pnlData?: PnLData | null;
  salesData?: SalesData | null;
  purchasesData?: PurchasesData | null;
  inventoryData?: InventoryData | null;
  balancesData?: BalancesData | null;
}

export function ReportClientViewer({
  currentTab,
  fromDate,
  toDate,
  pnlData,
  salesData,
  purchasesData,
  inventoryData,
  balancesData,
}: ReportClientViewerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(currentTab || "pnl");
  const [start, setStart] = useState(fromDate || "");
  const [end, setEnd] = useState(toDate || "");
  const [isExporting, startExport] = useTransition();
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const applyFilters = (tab: string, newStart?: string, newEnd?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    if (newStart) params.set("from", newStart);
    else params.delete("from");

    if (newEnd) params.set("to", newEnd);
    else params.delete("to");

    router.push(`/reports?${params.toString()}`);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    applyFilters(tab, start, end);
  };

  const handleApplyDateRange = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(activeTab, start, end);
  };

  const handlePreset = (preset: "month" | "last30" | "ytd" | "all") => {
    const now = new Date();
    let s = "";
    let e = now.toISOString().slice(0, 10);

    if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      s = firstDay.toISOString().slice(0, 10);
    } else if (preset === "last30") {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      s = past.toISOString().slice(0, 10);
    } else if (preset === "ytd") {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
      s = firstDayOfYear.toISOString().slice(0, 10);
    } else if (preset === "all") {
      s = "";
      e = "";
    }

    setStart(s);
    setEnd(e);
    applyFilters(activeTab, s, e);
  };

  const handleExportCsv = () => {
    setExportMessage(null);
    startExport(async () => {
      let reportTypeEnum = "PROFIT_AND_LOSS";
      if (activeTab === "sales") reportTypeEnum = "SALES_SUMMARY";
      else if (activeTab === "purchases") reportTypeEnum = "PURCHASES_SUMMARY";
      else if (activeTab === "inventory") reportTypeEnum = "INVENTORY_VALUATION";
      else if (activeTab === "low_stock") reportTypeEnum = "LOW_STOCK_ALERT";
      else if (activeTab === "balances") reportTypeEnum = "PROFIT_AND_LOSS";

      const res = await exportReportCsvAction(reportTypeEnum, start || undefined, end || undefined);
      if (res.success && res.csv && res.filename) {
        // Trigger browser file download
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", res.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setExportMessage(`Downloaded ${res.filename}`);
      } else {
        setExportMessage(res.error || "Export failed.");
      }
    });
  };

  const tabs = [
    { id: "pnl", label: "Profit & Loss", icon: DollarSign },
    { id: "sales", label: "Sales Summary", icon: ShoppingCart },
    { id: "purchases", label: "Purchases Summary", icon: Receipt },
    { id: "inventory", label: "Inventory Valuation", icon: Package },
    { id: "low_stock", label: "Low-Stock Alerts", icon: AlertTriangle },
    { id: "balances", label: "Receivables & Payables", icon: Scale },
  ];

  return (
    <div className="space-y-6">
      {/* Controls Bar: Tabs, Date Filter, Export */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        {/* Report Types Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isSel
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Filter & Export Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleApplyDateRange} className="flex items-center gap-2">
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
              title="Start Date"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
              title="End Date"
            />
            <button
              type="submit"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
              title="Apply Date Filter"
            >
              <Filter className="w-4 h-4" />
            </button>
          </form>

          <div className="hidden sm:flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              type="button"
              onClick={() => handlePreset("month")}
              className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-300"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handlePreset("last30")}
              className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-300"
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => handlePreset("all")}
              className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-300"
            >
              All Time
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/25 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ml-auto"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {exportMessage && (
        <div className="text-xs p-3 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
          {exportMessage}
        </div>
      )}

      {/* TAB 1: PROFIT & LOSS */}
      {activeTab === "pnl" && pnlData && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Total Revenue</span>
              <p className="text-xl font-bold text-white mt-1">
                LKR {Number(pnlData.summary.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-500">From paid customer sales & operating income</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Cost of Goods Sold (COGS)</span>
              <p className="text-xl font-bold text-rose-400 mt-1">
                LKR {Number(pnlData.summary.totalCostOfGoodsSold).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-500">Direct product acquisition/inventory costs</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Operating Expenses (OPEX)</span>
              <p className="text-xl font-bold text-amber-400 mt-1">
                LKR {Number(pnlData.summary.totalOperatingExpenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-500">Overheads, utilities, salaries, maintenance</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Net Operating Income</span>
              <p
                className={`text-xl font-bold mt-1 ${
                  pnlData.summary.netIncome >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                LKR {Number(pnlData.summary.netIncome).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-500">
                Operating Margin: {pnlData.summary.operatingMarginPercent}%
              </span>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-semibold text-sm text-white">Profit & Loss Breakdown</h3>
              <span className="text-xs text-slate-400">Status: Verified Ledger Only</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Line Item / Category</th>
                    <th className="py-3 px-4 text-right">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  <tr className="bg-slate-950/20 font-semibold">
                    <td className="py-2.5 px-4 text-emerald-400">1. OPERATING REVENUE</td>
                    <td className="py-2.5 px-4 text-right text-emerald-400">
                      {Number(pnlData.summary.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {(pnlData.revenueBreakdown || pnlData.revenueByCategory || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2 px-6 text-slate-300">&bull; {item.category}</td>
                      <td className="py-2 px-4 text-right">
                        {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-slate-950/20 font-semibold">
                    <td className="py-2.5 px-4 text-rose-400">2. COST OF GOODS SOLD</td>
                    <td className="py-2.5 px-4 text-right text-rose-400">
                      ({Number(pnlData.summary.totalCostOfGoodsSold).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                    </td>
                  </tr>

                  <tr className="bg-slate-900 font-bold border-y border-slate-700">
                    <td className="py-3 px-4 text-white">GROSS PROFIT</td>
                    <td className="py-3 px-4 text-right text-white">
                      {Number(pnlData.summary.grossProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr className="bg-slate-950/20 font-semibold">
                    <td className="py-2.5 px-4 text-amber-400">3. OPERATING EXPENSES</td>
                    <td className="py-2.5 px-4 text-right text-amber-400">
                      ({Number(pnlData.summary.totalOperatingExpenses).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                    </td>
                  </tr>
                  {(pnlData.expenseBreakdown || pnlData.expensesByCategory || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2 px-6 text-slate-300">&bull; {item.category}</td>
                      <td className="py-2 px-4 text-right">
                        {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-slate-900/90 font-extrabold border-t-2 border-slate-700 text-sm">
                    <td className="py-3.5 px-4 text-white">NET OPERATING PROFIT</td>
                    <td
                      className={`py-3.5 px-4 text-right ${
                        pnlData.summary.netIncome >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      LKR {Number(pnlData.summary.netIncome).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALES SUMMARY */}
      {activeTab === "sales" && salesData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Total Sales Orders</span>
              <p className="text-xl font-bold text-white mt-1">{salesData.summary.totalOrders}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Total Sales Volume</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                LKR {Number(salesData.summary.totalSalesVolume).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Total Cash Collected</span>
              <p className="text-xl font-bold text-blue-400 mt-1">
                LKR {Number(salesData.summary.totalCollected).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Fulfillment</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {salesData.orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No sales transactions found for this period.
                      </td>
                    </tr>
                  ) : (
                    salesData.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-medium text-emerald-400">{o.orderNumber}</td>
                        <td className="py-3 px-4 font-medium text-white">{o.customerName}</td>
                        <td className="py-3 px-4 text-slate-400">{new Date(o.orderDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700">
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              o.paymentStatus === "PAID"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-white">
                          LKR {Number(o.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PURCHASES SUMMARY */}
      {activeTab === "purchases" && purchasesData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Total Purchase Orders</span>
              <p className="text-xl font-bold text-white mt-1">{purchasesData.summary.totalPurchases}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Total Purchase Volume</span>
              <p className="text-xl font-bold text-rose-400 mt-1">
                LKR {Number(purchasesData.summary.totalPurchasesVolume).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Purchase #</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Receipt Status</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {purchasesData.purchases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No purchase orders found for this period.
                      </td>
                    </tr>
                  ) : (
                    purchasesData.purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-medium text-amber-400">{p.purchaseNumber}</td>
                        <td className="py-3 px-4 font-medium text-white">{p.supplierName}</td>
                        <td className="py-3 px-4 text-slate-400">{new Date(p.purchaseDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 border border-slate-700">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              p.paymentStatus === "PAID"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {p.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-white">
                          LKR {Number(p.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY VALUATION & LOW STOCK */}
      {(activeTab === "inventory" || activeTab === "low_stock") && inventoryData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Total Catalog Items</span>
              <p className="text-xl font-bold text-white mt-1">{inventoryData.totalProducts}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Inventory Cost Valuation</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                LKR {Number(inventoryData.totalCostValuation).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Low-Stock Alert Items</span>
              <p className="text-xl font-bold text-amber-400 mt-1">{inventoryData.lowStockCount}</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Available Stock</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4 text-right">Cost Valuation</th>
                    <th className="py-3 px-4 text-center">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {inventoryData.items
                    .filter((item) => (activeTab === "low_stock" ? item.isLowStock : true))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-medium text-slate-300">{item.sku}</td>
                        <td className="py-3 px-4 font-semibold text-white">{item.name}</td>
                        <td className="py-3 px-4 text-slate-400">{item.category}</td>
                        <td className="py-3 px-4 text-right font-medium text-white">{item.currentStock}</td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {Number(item.unitCost).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                          {Number(item.costValuation).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock ({item.currentStock} &le; {item.reorderLevel ?? "min"})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Adequate
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RECEIVABLES & PAYABLES */}
      {activeTab === "balances" && balancesData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Outstanding Customer Receivables</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                LKR {Number(balancesData.totalReceivables).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-500">Uncollected payments on delivered orders</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Outstanding Supplier Payables</span>
              <p className="text-xl font-bold text-rose-400 mt-1">
                LKR {Number(balancesData.totalPayables).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-500">Unpaid balances for received supplier inventory</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receivables List */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800">
                <h4 className="font-semibold text-sm text-white">Customer Balances</h4>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4 text-right">Outstanding (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {balancesData.customers.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-slate-500">
                        No outstanding customer balances.
                      </td>
                    </tr>
                  ) : (
                    balancesData.customers.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 px-4 font-medium text-white">{c.name}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-emerald-400">
                          {Number(c.outstandingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Payables List */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800">
                <h4 className="font-semibold text-sm text-white">Supplier Balances</h4>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Supplier</th>
                    <th className="py-2.5 px-4 text-right">Outstanding (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {balancesData.suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-slate-500">
                        No outstanding supplier balances.
                      </td>
                    </tr>
                  ) : (
                    balancesData.suppliers.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-4 font-medium text-white">{s.name}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-rose-400">
                          {Number(s.outstandingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
