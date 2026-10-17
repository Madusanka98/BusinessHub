import React from "react";
import { redirect } from "next/navigation";
import { tryGetTenantContext } from "@/lib/tenant/context";
import { assertTenantPermission } from "@/lib/tenant/guards";
import { ReportsNav } from "./reports-nav";
import { ReportClientViewer } from "./report-client-viewer";
import {
  getProfitAndLossReport,
  getSalesSummaryReport,
  getPurchasesSummaryReport,
  getInventoryValuationReport,
  getCustomerSupplierBalancesReport,
} from "@/modules/reports/services/reports.service";

interface ReportsPageProps {
  searchParams: Promise<{
    tab?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function ReportsPage(props: ReportsPageProps) {
  const context = await tryGetTenantContext();
  if (!context) {
    redirect("/businesses");
  }

  assertTenantPermission(context, "reports:view");

  const searchParams = await props.searchParams;
  const currentTab = searchParams.tab || "pnl";
  const fromDate = searchParams.from ? new Date(searchParams.from) : undefined;
  const toDate = searchParams.to ? new Date(searchParams.to) : undefined;

  let pnlData = null;
  let salesData = null;
  let purchasesData = null;
  let inventoryData = null;
  let balancesData = null;

  if (currentTab === "pnl") {
    pnlData = await getProfitAndLossReport(context.businessId, fromDate, toDate);
  } else if (currentTab === "sales") {
    salesData = await getSalesSummaryReport(context.businessId, fromDate, toDate);
  } else if (currentTab === "purchases") {
    purchasesData = await getPurchasesSummaryReport(context.businessId, fromDate, toDate);
  } else if (currentTab === "inventory" || currentTab === "low_stock") {
    inventoryData = await getInventoryValuationReport(context.businessId);
  } else if (currentTab === "balances") {
    balancesData = await getCustomerSupplierBalancesReport(context.businessId);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Business Reports & Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time financial P&L, commercial summaries, inventory valuation, and cash flow balances.
          </p>
        </div>
      </div>

      <ReportsNav />

      <ReportClientViewer
        currentTab={currentTab}
        fromDate={searchParams.from}
        toDate={searchParams.to}
        pnlData={pnlData}
        salesData={salesData}
        purchasesData={purchasesData}
        inventoryData={inventoryData}
        balancesData={balancesData}
      />
    </div>
  );
}
