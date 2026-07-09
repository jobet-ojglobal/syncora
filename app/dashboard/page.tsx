"use client";

import React, { useState } from 'react';
import { 
  BarChart3, LineChart, ShoppingBag, Users, Layers, CheckCircle2, AlertTriangle, 
  RefreshCw, Calendar, ChevronDown, ArrowUpRight, ArrowDownRight, Building2, Clock, MapPin
} from 'lucide-react';

// ==========================================
// 1. HARDCODED MOCK DATA (data.ts mapping)
// ==========================================
const mockKPIs = [
  { title: "Total Revenue", value: "$45,231.89", change: "+20.1% from last month", isPositive: true, icon: BarChart3 },
  { title: "Orders Processed", value: "2,345", change: "+180.5% from last month", isPositive: true, icon: ShoppingBag },
  { title: "Active Customers", value: "+12,234", change: "+19% from last month", isPositive: true, icon: Users },
  { title: "Low Stock Items", value: "12", change: "-4 items resolved today", isPositive: false, icon: Layers },
];

const mockRecentOrders = [
  { id: "#ORD-3124", customer: "Alex Rivera", total: "$124.50", status: "Completed", branch: "Downtown" },
  { id: "#ORD-3123", customer: "Sarah Chen", total: "$89.00", status: "Processing", branch: "Westside" },
  { id: "#ORD-3122", customer: "Marcus Johnson", total: "$210.00", status: "Completed", branch: "Downtown" },
  { id: "#ORD-3121", customer: "Emma Davis", total: "$45.10", status: "Failed", branch: "North Gate" },
];

const mockLowStock = [
  { item: "Wireless Mouse X1", sku: "MS-X1-BLK", stock: 2, branch: "Downtown" },
  { item: "Mechanical Keyboard", sku: "KB-MECH-99", stock: 1, branch: "Westside" },
  { item: "USB-C Hub 7-in-1", sku: "HUB-C7", stock: 0, branch: "North Gate" },
];

const mockSyncStatus = [
  { channel: "Shopify Store", status: "Synced", time: "2 mins ago", type: "success" },
  { channel: "Square POS", status: "Synced", time: "5 mins ago", type: "success" },
  { channel: "Amazon FBA", status: "Syncing...", time: "In progress", type: "pending" },
];

const mockTopProducts = [
  { name: "Premium Leather Wallet", sales: 1240, revenue: "$31,000", share: 40 },
  { name: "Minimalist Backpack", sales: 890, revenue: "$22,250", share: 30 },
  { name: "Stainless Water Bottle", sales: 620, revenue: "$9,300", share: 20 },
];

const mockBranchPerformance = [
  { name: "Downtown Branch", sales: "$24,500", growth: "+12.3%", rating: "4.8" },
  { name: "Westside Hub", sales: "$14,200", growth: "+8.1%", rating: "4.5" },
  { name: "North Gate Retail", sales: "$6,531", growth: "-2.4%", rating: "4.1" },
];

const mockActivities = [
  { text: "Inventory restocked for 'Mechanical Keyboard'", branch: "Westside Hub", time: "10 mins ago" },
  { text: "Payout payout dispatched to main account", branch: "System", time: "1 hour ago" },
  { text: "Bulk order CSV imported successfully", branch: "Downtown Branch", time: "2 hours ago" },
];

// ==========================================
// 2. REUSABLE UI COMPONENTS (Shadcn Mock primitives)
// ==========================================
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`rounded-xl border border-neutral-200 bg-white text-neutral-950 shadow-sm ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-sm font-semibold leading-none tracking-tight text-neutral-500 ${className}`}>{children}</h3>
);

const CardContent = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);

const Button = ({ children, variant = 'primary', className = "", ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 gap-2 border border-neutral-200 shadow-sm bg-white hover:bg-neutral-50 text-neutral-700";
  return <button className={`${baseStyle} ${className}`} {...props}>{children}</button>;
};

// ==========================================
// 3. MAIN DASHBOARD VIEW
// ==========================================
export default function SyncoraDashboard() {
  const [selectedBranch, setSelectedBranch] = useState("All Branches");

  return (
    <div className="min-h-screen bg-neutral-50/50 p-6 space-y-6 text-neutral-800 font-sans max-w-[1600px] mx-auto">
      
      {/* --- DASHBOARD HEADER --- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Welcome back, Admin</h1>
          <p className="text-sm text-neutral-500">Here&apos;s what&apos;s happening across your channels today.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Selector */}
          <Button>
            <Building2 className="h-4 w-4 text-neutral-400" />
            {selectedBranch}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>

          {/* Date Range Picker */}
          <Button>
            <Calendar className="h-4 w-4 text-neutral-400" />
            Jan 01, 2026 - Present
          </Button>

          {/* Refresh Action */}
          <Button className="w-9 px-0" title="Refresh metrics">
            <RefreshCw className="h-4 w-4 text-neutral-500" />
          </Button>
        </div>
      </div>

      {/* --- KPI CARDS SECTION --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mockKPIs.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{kpi.title}</CardTitle>
                <Icon className="h-4 w-4 text-neutral-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{kpi.value}</div>
                <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                  {kpi.isPositive ? (
                    <span className="text-emerald-600 font-medium">{kpi.change.split(' ')[0]}</span>
                  ) : (
                    <span className="text-amber-600 font-medium">{kpi.change.split(' ')[0]}</span>
                  )}
                  <span className="text-neutral-400">{kpi.change.substring(kpi.change.indexOf(' '))}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* --- CHARTS SECTION (Mock Visualization) --- */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-neutral-900">Sales Overview</div>
            <div className="text-xs text-neutral-500">Daily revenue distribution graph</div>
          </CardHeader>
          <CardContent className="h-48 flex items-end gap-2 pt-4 px-6 border-t border-neutral-100 bg-neutral-50/50">
            {[45, 60, 40, 75, 50, 85, 95, 65, 80, 100, 110, 130].map((val, i) => (
              <div key={i} className="flex-1 bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-all cursor-pointer" style={{ height: `${(val / 130) * 100}%` }} title={`$${val * 100}`} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-semibold text-neutral-900">Branch Share Distribution</div>
            <div className="text-xs text-neutral-500">Order breakdown by storefront allocation</div>
          </CardHeader>
          <CardContent className="h-48 flex items-center justify-around pt-4 border-t border-neutral-100 bg-neutral-50/50">
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center font-bold text-sm">52%</div>
              <span className="text-xs text-neutral-500">Downtown</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-full border-4 border-purple-500 flex items-center justify-center font-bold text-sm">33%</div>
              <span className="text-xs text-neutral-500">Westside</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-full border-4 border-orange-500 flex items-center justify-center font-bold text-sm">15%</div>
              <span className="text-xs text-neutral-500">North Gate</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- MIDDLE SECTION (3 Columns) --- */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Orders Component */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="text-sm font-semibold text-neutral-900">Recent Orders</div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="divide-y divide-neutral-100 text-sm">
              {mockRecentOrders.map((order, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">{order.id}</div>
                    <div className="text-xs text-neutral-400">{order.customer} • {order.branch}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{order.total}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      order.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                      order.status === 'Processing' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                    }`}>{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Watchlist */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="text-sm font-semibold text-neutral-900">Low Stock Alert</div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="divide-y divide-neutral-100 text-sm">
              {mockLowStock.map((item, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">{item.item}</div>
                    <div className="text-xs text-neutral-400">SKU: {item.sku} • <span className="text-neutral-500">{item.branch}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${item.stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                      {item.stock} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Channels / Sync Status */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="text-sm font-semibold text-neutral-900">Channel Sync Status</div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3">
              {mockSyncStatus.map((sync, i) => (
                <div key={i} className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    {sync.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                    <span className="font-medium text-neutral-800">{sync.channel}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-neutral-500">{sync.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- BOTTOM SECTION (2 Columns) & RECENT ACTIVITIES --- */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Selling Products */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="text-sm font-semibold text-neutral-900">Top Products</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTopProducts.map((prod, i) => (
                <div key={i} className="space-y-1 text-sm">
                  <div className="flex justify-between font-medium">
                    <span className="truncate max-w-[180px] text-neutral-900">{prod.name}</span>
                    <span className="text-neutral-500">{prod.revenue}</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-neutral-800 h-full rounded-full" style={{ width: `${prod.share}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Branch Performance Summary */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="text-sm font-semibold text-neutral-900">Branch Rankings</div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-neutral-100 text-sm">
              {mockBranchPerformance.map((branch, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="font-medium text-neutral-900">{branch.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{branch.sales}</div>
                    <span className={`text-xs ${branch.growth.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>{branch.growth}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="text-sm font-semibold text-neutral-900">Live Activity Feed</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-xs">
              {mockActivities.map((act, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="mt-0.5 bg-neutral-100 p-1 rounded-full text-neutral-600">
                    <Clock className="h-3 w-3" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-neutral-800 leading-tight font-medium">{act.text}</p>
                    <p className="text-neutral-400">{act.branch} • {act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}