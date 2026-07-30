"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Package,
  AlertTriangle,
  ArrowUpDown,
  PlusCircle,
  Truck,
  ArrowRightLeft,
  Barcode,
  TrendingUp,
  Boxes,
  Warehouse,
  History,
  RefreshCw,
} from "lucide-react";

// Types matching API response structure
interface DashboardData {
  kpis: {
    totalValue: number;
    lowStockCount: number;
    pendingTransfers: number;
  };
  recentAdjustments: Array<{
    id: string;
    adjustmentNumber: string;
    reason: string;
    performedBy: string;
    itemCount: number;
    status: "DRAFT" | "POSTED" | "VOIDED";
    createdAt: string;
  }>;
  topMovingProducts: Array<{
    sku: string;
    name: string;
    movedQty: number;
    status: "IN_STOCK" | "LOW_STOCK";
  }>;
  warehouseUtilization: Array<{
    name: string;
    occupied: number;
    totalBins: number;
    filledBins: number;
  }>;
  movementChart: number[];
}

export default function InventoryDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/inventory/dashboard");
      if (!response.ok) {
        throw new Error("Failed to load dashboard data");
      }
      const result: DashboardData = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Max value calculation for scaling chart bars
  const maxChartValue = data?.movementChart
    ? Math.max(...data.movementChart, 1)
    : 1;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 bg-slate-50/50 min-h-screen text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventory Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Real-time overview of stock levels, movements, and adjustments.
          </p>
        </div>

        {/* Quick Actions & Refresh Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
            <PlusCircle className="w-4 h-4" />
            Adjust Inventory
          </button>
          <button className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <Truck className="w-4 h-4 text-slate-500" />
            Receive Purchase
          </button>
          <button className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <ArrowRightLeft className="w-4 h-4 text-slate-500" />
            Transfer Stock
          </button>
          <button className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <Barcode className="w-4 h-4 text-slate-500" />
            Search Serial
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Inventory Value */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Inventory Value
            </span>
            {loading ? (
              <div className="h-8 w-32 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-slate-900">
                ${data?.kpis.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Live Cost Total
            </p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Low Stock Alerts
            </span>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-amber-600">
                {data?.kpis.lowStockCount} Products
              </div>
            )}
            <p className="text-xs text-slate-500">
              Below reorder threshold
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Transfers */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Pending Movements
            </span>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-slate-900">
                {data?.kpis.pendingTransfers} Records
              </div>
            )}
            <p className="text-xs text-slate-500">
              In-flight ledger activity
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ArrowUpDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Movements, Adjustments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stock Movement Chart */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                Stock Movement Dynamics
              </h2>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                Last 30 Days (Weekly)
              </span>
            </div>
            
            <div className="h-44 w-full flex items-end justify-between gap-4 pt-6 pb-2 px-2 border-b border-slate-100">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex-1 bg-slate-100 animate-pulse rounded-t h-full" />
                  ))
                : data?.movementChart.map((val, idx) => {
                    const heightPercent = Math.max((val / maxChartValue) * 100, 5);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                        <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {val} units
                        </span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-slate-800 rounded-t group-hover:bg-slate-600 transition-all duration-300"
                        />
                      </div>
                    );
                  })}
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 px-1">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
            </div>
          </div>

          {/* Recent Adjustments Table */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Recent Adjustments
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="pb-2">Adjustment #</th>
                    <th className="pb-2">Reason</th>
                    <th className="pb-2">Lines</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={4} className="py-3">
                          <div className="h-4 bg-slate-100 animate-pulse rounded w-full" />
                        </td>
                      </tr>
                    ))
                  ) : data?.recentAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        No adjustments found.
                      </td>
                    </tr>
                  ) : (
                    data?.recentAdjustments.map((adj) => (
                      <tr key={adj.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-medium text-slate-900">
                          {adj.adjustmentNumber}
                        </td>
                        <td className="py-2.5 text-slate-600">{adj.reason}</td>
                        <td className="py-2.5 text-slate-500">{adj.itemCount} line(s)</td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              adj.status === "POSTED"
                                ? "bg-emerald-50 text-emerald-700"
                                : adj.status === "DRAFT"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {adj.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Top Moving Products & Warehouse Capacity */}
        <div className="space-y-6">
          {/* Top Moving Products */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              Top Moving Products
            </h2>
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />
                ))
              ) : data?.topMovingProducts.length === 0 ? (
                <p className="text-xs text-slate-400">No product ledger activity recorded.</p>
              ) : (
                data?.topMovingProducts.map((prod, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-slate-900">
                        {prod.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{prod.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-900">
                        {prod.movedQty.toLocaleString()} units
                      </div>
                      <div className="text-[10px]">
                        {prod.status === "LOW_STOCK" ? (
                          <span className="text-amber-600 font-medium">Low Stock</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">In Stock</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Warehouse Capacity */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-slate-500" />
              Warehouse Utilization
            </h2>
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />
                ))
              ) : data?.warehouseUtilization.length === 0 ? (
                <p className="text-xs text-slate-400">No warehouse locations configured.</p>
              ) : (
                data?.warehouseUtilization.map((wh) => (
                  <div key={wh.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-800">{wh.name}</span>
                      <span className="text-slate-500 font-semibold">{wh.occupied}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${wh.occupied}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          wh.occupied > 85 ? "bg-amber-500" : "bg-slate-800"
                        }`}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {wh.filledBins} of {wh.totalBins} sublocations utilized
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}