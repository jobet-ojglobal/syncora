"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { 
  ArrowLeft, Edit3, Building2, UserCheck, Mail, Phone, Globe, FileText, 
  MapPin, CheckCircle2, XCircle, ShoppingBag, Landmark, Truck, ShieldCheck, 
  BadgeDollarSign, Calendar, Clock, Layers, AlertCircle, Coins, ShieldAlert,
  Percent, ArrowDownRight, ArrowUpRight, Scale, ReceiptText,
  Package,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed syncing business partner metrics.");
  return res.json();
});

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

export default function BusinessPartnerOverviewPage({ params }: OverviewPageProps) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  // SWR dynamically fetches unified records matching your Prisma structure
  const { data: partner, error, isLoading } = useSWR(
    `/api/admin/business-partners/${id}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse m-6">
        Assembling unified entity data matrix and analyzing dual-ledger mapping records...
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium m-6">
        Infrastructure Error: Failed assembling record mapping context parameters for Partner ID: {id}
      </div>
    );
  }

  // Aggregate customer financial summaries
  const customerBalances = partner.customer?.balances || [];
  const totalReceivables = customerBalances.reduce((acc: number, curr: any) => acc + Number(curr.balance), 0);
  const customerCurrency = customerBalances[0]?.currency?.isoCode || "USD";

  // Aggregate vendor accounts payable dues
  const liveDuesRow = partner.vendor?.dues?.[0];
  const totalPayables = liveDuesRow 
    ? Number(liveDuesRow.amountCurrent) + 
      Number(liveDuesRow.amount1To30) + 
      Number(liveDuesRow.amount31To60) + 
      Number(liveDuesRow.amount61Plus)
    : 0;
  const vendorCurrency = partner.vendor?.currency?.isoCode || "USD";

  return (
    <div className="w-full mx-auto p-6 space-y-6 text-xs">
      
      {/* Return Navigation and Editing Controls Container */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs font-medium">
          <Link href="/dashboard/business-partners">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Partners Directory
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs font-semibold">
          {/* Linked using dashboard namespace context consistent with edit route schema */}
          <Link href={`/dashboard/business-partners/${id}/edit`}>
            <Edit3 className="w-3.5 h-3.5" /> Modify Account Properties
          </Link>
        </Button>
      </div>

      {/* Main Profile Heading Card */}
      <div className="bg-card border rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground">{partner.name}</h1>
            <div className="flex gap-1 items-center">
              {partner.isActive ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200/30 font-bold text-[10px] h-5">
                  <CheckCircle2 className="w-3 h-3 mr-0.5" /> Active Baseline
                </Badge>
              ) : (
                <Badge variant="destructive" className="font-bold text-[10px] h-5">
                  <XCircle className="w-3 h-3 mr-0.5" /> Suspended
                </Badge>
              )}
              {partner.customer && (
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-200/30 font-bold text-[10px] h-5">
                  Customer
                </Badge>
              )}
              {partner.vendor && (
                <Badge className="bg-amber-500/10 text-amber-500 border-amber-200/30 font-bold text-[10px] h-5">
                  Vendor
                </Badge>
              )}
            </div>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed max-w-2xl font-medium">
            {partner.remarks || "No administrative annotations or profile ledger summaries saved for this entity."}
          </p>
        </div>

        {/* High-Level Consolidated Balances Display */}
        <div className="flex gap-4 border-l md:pl-6 text-right shrink-0">
          {partner.customer && (
            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[10px] font-medium block">A/R Net Balance</span>
              <span className={`font-mono text-base font-bold ${totalReceivables > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {totalReceivables > 0 ? "+" : ""}
                {totalReceivables.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {customerCurrency}
              </span>
            </div>
          )}
          {partner.vendor && (
            <div className="space-y-0.5 border-l pl-4">
              <span className="text-muted-foreground text-[10px] font-medium block">A/P Leverage Debt</span>
              <span className="font-mono text-base font-bold text-amber-600">
                {totalPayables.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {vendorCurrency}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Context Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Essential Contact and Core Address Matrix */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" /> Contact Coordinates
              </CardTitle>
              <CardDescription className="text-[10px]">Master organizational connectivity lines.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-medium text-foreground">
              <div className="flex items-center gap-2 border-b pb-2">
                <UserCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground text-[10px] block font-normal">Point of Contact</span>
                  <span>{partner.contactName || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 border-b pb-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="truncate">
                  <span className="text-muted-foreground text-[10px] block font-normal">Email Endpoint</span>
                  <span className="font-mono text-[11px] truncate select-all">{partner.email || "N/A"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 border-b pb-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground text-[10px] block font-normal">Phone Network</span>
                  <span>{partner.phone || "N/A"}</span>
                </div>
              </div>
              {partner.fax && (
                <div className="flex items-center gap-2 border-b pb-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-normal">Fax Transmission</span>
                    <span>{partner.fax}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground text-[10px] block font-normal">Web Portal</span>
                  {partner.website ? (
                    <a href={partner.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {partner.website}
                    </a>
                  ) : "N/A"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Addresses Mapping Grid Blocks */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" /> Registered Addresses
              </CardTitle>
              <CardDescription className="text-[10px]">Physical shipping anchors and tax targets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(!partner.addresses || partner.addresses.length === 0) ? (
                <div className="text-muted-foreground italic text-center py-4">No localized physical mapping coordinates stored.</div>
              ) : (
                partner.addresses.map((addr: any) => (
                  <div key={addr.id} className="p-3 bg-muted/40 border rounded-lg space-y-2 font-medium">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-[11px]">{addr.name || "HQ Branch"}</span>
                      <div className="flex gap-1 flex-wrap">
                        {addr.addressType && (
                          <Badge variant="outline" className="text-[8px] px-1 h-4 uppercase tracking-wide">
                            {addr.addressType}
                          </Badge>
                        )}
                        {addr.isDefaultBilling && (
                          <Badge className="bg-sky-500/10 text-sky-600 border-sky-200/20 text-[8px] px-1 h-4">
                            Billing
                          </Badge>
                        )}
                        {addr.isDefaultShipping && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200/20 text-[8px] px-1 h-4">
                            Shipping
                          </Badge>
                        )}
                        {addr.isDefaultVendorAddress && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200/20 text-[8px] px-1 h-4">
                            Vendor
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-slate-600 font-sans leading-relaxed text-[11px]">
                      <div>{addr.address1}</div>
                      {addr.address2 && <div>{addr.address2}</div>}
                      <div>{addr.city}, {addr.state} {addr.postalCode}</div>
                      <div className="text-foreground font-semibold text-[10px] uppercase mt-0.5 tracking-tight">{addr.country}</div>
                    </div>
                    {addr.remarks && (
                      <p className="text-[10px] text-muted-foreground border-t pt-1.5 font-normal italic">
                        Note: {addr.remarks}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Roles Execution Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue={partner.customer ? "customer-role" : "vendor-role"} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 p-1">
              <TabsTrigger value="customer-role" disabled={!partner.customer} className="text-xs font-bold gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> Customer Functional Role
              </TabsTrigger>
              <TabsTrigger value="vendor-role" disabled={!partner.vendor} className="text-xs font-bold gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Vendor Supply Role
              </TabsTrigger>
            </TabsList>

            {/* TAB CONTENT: CUSTOMER CORE METRICS */}
            <TabsContent value="customer-role" className="mt-4 space-y-6">
              {partner.customer && (
                <>
                  {/* Customer Policy Setup Indicators */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="shadow-3xs">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-bold">
                          <Landmark className="w-3.5 h-3.5 text-slate-400" /> Administrative Governance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 font-medium space-y-2">
                        <div className="flex justify-between border-b py-1">
                          <span className="text-muted-foreground">Inflow Token ID:</span>
                          <span className="font-mono select-all font-bold">{partner.customer.inflowId}</span>
                        </div>
                        <div className="flex justify-between border-b py-1">
                          <span className="text-muted-foreground">Pricing Tier:</span>
                          <span className="text-foreground font-semibold">{partner.customer.pricingScheme?.name || "Standard Price Matrix"}</span>
                        </div>
                        <div className="flex justify-between border-b py-1">
                          <span className="text-muted-foreground">Tax Matrix Protocol:</span>
                          <span className="text-foreground font-semibold">{partner.customer.taxingScheme?.name || "Open Tax Exempt"}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Scale className="w-3 h-3 text-slate-400" /> Tax Exempt No.
                          </span>
                          <span className="font-mono font-semibold">{partner.customer.taxExemptNumber || "None Assigned"}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-3xs">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-bold">
                          <BadgeDollarSign className="w-3.5 h-3.5 text-slate-400" /> Logistics & Sales Defaults
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 font-medium space-y-2">
                        <div className="flex justify-between border-b py-1">
                          <span className="text-muted-foreground">Payment Terms:</span>
                          <span>{partner.customer.defaultPaymentTerms?.name || "Immediate COD"}</span>
                        </div>
                        <div className="flex justify-between border-b py-1">
                          <span className="text-muted-foreground">Payment Route:</span>
                          <span>{partner.customer.defaultPaymentMethod || "Standard Processing"}</span>
                        </div>
                        <div className="flex justify-between border-b py-1">
                          <span className="text-muted-foreground">Assigned Carrier Line:</span>
                          <span>{partner.customer.defaultCarrier || "Ex-Works Logistics"}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Percent className="w-3 h-3 text-slate-400" /> Customer Discount Rate:
                          </span>
                          <span className="font-bold text-indigo-600">{partner.customer.discount ? `${partner.customer.discount}%` : "0.00%"}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Customer Liquid Account Balances & Available Credits */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Live Balances Array */}
                    <Card className="shadow-3xs">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-muted-foreground" /> Account Balance Matrix
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(!partner.customer.balances || partner.customer.balances.length === 0) ? (
                          <div className="text-muted-foreground italic text-center py-2">No active balances.</div>
                        ) : (
                          partner.customer.balances.map((bal: any) => (
                            <div key={bal.id} className="flex justify-between items-center p-2 bg-muted/30 rounded border">
                              <span className="font-medium text-slate-500">{bal.currency?.name} ({bal.currency?.isoCode})</span>
                              <span className={`font-mono font-bold ${Number(bal.balance) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                {Number(bal.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {bal.currency?.symbol}
                              </span>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    {/* Available Credits Array */}
                    <Card className="shadow-3xs">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                          <ReceiptText className="w-4 h-4 text-muted-foreground" /> Customer Store Credits
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {(!partner.customer.credits || partner.customer.credits.length === 0) ? (
                          <div className="text-muted-foreground italic text-center py-2">No available store credit lines.</div>
                        ) : (
                          partner.customer.credits.map((cred: any) => (
                            <div key={cred.id} className="flex justify-between items-center p-2 bg-muted/30 rounded border">
                              <span className="font-medium text-slate-500">{cred.currency?.name} ({cred.currency?.isoCode})</span>
                              <span className="font-mono font-bold text-blue-600">
                                {Number(cred.credit).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cred.currency?.symbol}
                              </span>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Customer Receivables Multi-tier Bucket Summary */}
                  <Card className="shadow-3xs">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" /> Accounts Receivable Aging Ledger Rows
                      </CardTitle>
                      <CardDescription className="text-[10px]">Unpaid balances distributed inside operational aging buckets.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(!partner.customer.dues || partner.customer.dues.length === 0) ? (
                        <div className="text-muted-foreground italic text-center py-4">No outstanding balance liability logs located.</div>
                      ) : (
                        partner.customer.dues.map((due: any) => (
                          <div key={due.id} className="space-y-3">
                            <div className="flex justify-between items-center bg-muted/40 p-2 rounded-md font-mono text-[11px] font-bold">
                              <span className="text-muted-foreground font-sans text-xs flex items-center gap-1">
                                <ArrowDownRight className="w-3.5 h-3.5 text-red-500" /> Currency Allocation Stack
                              </span>
                              <span className="text-foreground">{due.currency?.name} — {due.currency?.isoCode} ({due.currency?.symbol})</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-center">
                              <div className="bg-muted/30 border p-2.5 rounded-lg">
                                <span className="text-muted-foreground text-[9px] block uppercase tracking-wider font-sans mb-1">Current</span>
                                <span className="font-bold text-foreground">{Number(due.amountCurrent).toFixed(2)}</span>
                              </div>
                              <div className="bg-muted/30 border p-2.5 rounded-lg">
                                <span className="text-muted-foreground text-[9px] block uppercase tracking-wider font-sans mb-1">1 - 30 Days</span>
                                <span className="font-bold text-foreground">{Number(due.amount1To30).toFixed(2)}</span>
                              </div>
                              <div className="bg-muted/30 border p-2.5 rounded-lg">
                                <span className="text-muted-foreground text-[9px] block uppercase tracking-wider font-sans mb-1">31 - 60 Days</span>
                                <span className="font-bold text-amber-600">{Number(due.amount31To60).toFixed(2)}</span>
                              </div>
                              <div className="bg-muted/30 border p-2.5 rounded-lg">
                                <span className="text-muted-foreground text-[9px] block uppercase tracking-wider font-sans mb-1">61+ Overdue</span>
                                <span className={`font-bold ${Number(due.amount61Plus) > 0 ? "text-rose-600 animate-pulse" : "text-muted-foreground"}`}>
                                  {Number(due.amount61Plus).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* TAB CONTENT: VENDOR SUPPLY METRICS */}
            <TabsContent value="vendor-role" className="mt-4 space-y-6">
              {partner.vendor && (
                <>
                  {/* Vendor Settings Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="shadow-3xs">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-bold">
                          <Layers className="w-3.5 h-3.5 text-slate-400" /> Supplier Configurations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 font-medium space-y-2">
                        {/* <div className="flex justify-between border-b py-1">
                          <span className="text-muted-foreground">Vendor Token Inflow:</span>
                          <span className="font-mono select-all font-bold">{partner.vendor.inflowId}</span>
                        </div> */}
                        <div className="flex justify-between border-b py-1">
                          <span className="text-muted-foreground">Catalog Scope:</span>
                          <span className="font-mono font-bold text-slate-700 bg-muted border rounded px-1.5 py-0.5">
                            {partner.vendor._count?.products || 0} Registered Items
                          </span>
                        </div>
                        <div className="flex justify-between border-b py-1">
                          <span className="text-muted-foreground">Operational Lead Time:</span>
                          <span className="font-semibold">{partner.vendor.leadTimeDays ? `${partner.vendor.leadTimeDays} Days` : "Unconfigured / Dynamic"}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Functional Currency:</span>
                          <span className="font-bold text-amber-600 uppercase">
                            {partner.vendor.currency?.description} ({partner.vendor.currency?.isoCode || "USD"})
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-3xs">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-bold">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Commercial Procurement Parameters
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 font-medium space-y-2">
                        <div className="flex justify-between border-b py-1">
                          <span className="text-muted-foreground">Payable Settlement Rule:</span>
                          <span>{partner.vendor.defaultPaymentTerms?.name || "Standard Catalog Grace"}</span>
                        </div>
                        <div className="flex justify-between border-b py-1">
                          <span className="text-muted-foreground">Pricing Policy:</span>
                          <span>{partner.vendor.isTaxInclusivePricing ? "Tax Inclusive Anchors" : "Gross Tax Exclusive Matrix"}</span>
                        </div>
                        <div className="flex justify-between border-b py-1">
                          <span className="text-muted-foreground">Tax Matrix Scope:</span>
                          <span>{partner.vendor.taxingScheme?.name || "Corporate Standard Open"}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Default Carrier:</span>
                          <span>{partner.vendor.defaultCarrier || "None Specified"}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Vendor Account Balances Detail Block */}
                  <Card className="shadow-3xs">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-muted-foreground" /> Accounts Payable Balances
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(!partner.vendor.balances || partner.vendor.balances.length === 0) ? (
                        <div className="text-muted-foreground italic text-center py-2">No active vendor balance metrics available.</div>
                      ) : (
                        partner.vendor.balances.map((bal: any) => (
                          <div key={bal.id} className="flex justify-between items-center p-2 bg-muted/30 rounded border">
                            <span className="font-medium text-slate-500">{bal.currency?.name} ({bal.currency?.isoCode})</span>
                            <span className="font-mono font-bold text-amber-600">
                              {Number(bal.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {bal.currency?.symbol}
                            </span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Vendor Aging Liabilities Details Block */}
                  <Card className="shadow-3xs">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-muted-foreground" /> Accounts Payable Aging Matrix
                      </CardTitle>
                      <CardDescription className="text-[10px]">Track processing enterprise debts alongside strategic leverage rules.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!liveDuesRow ? (
                        <div className="text-muted-foreground italic text-center py-4">No structured liability aging entries exist for this profile.</div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-muted/40 p-2 rounded-md font-mono text-[11px] font-bold">
                            <span className="text-muted-foreground font-sans text-xs flex items-center gap-1">
                              <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" /> Settlement Currency Base
                            </span>
                            <span className="text-foreground">{partner.vendor.currency?.name || "Standard Dollar"} ({partner.vendor.currency?.isoCode || "USD"})</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-center">
                            <div className="bg-muted/30 border p-2.5 rounded-lg">
                              <span className="text-muted-foreground text-[9px] block uppercase tracking-wider font-sans mb-1">Current Balance</span>
                              <span className="font-bold text-foreground">{Number(liveDuesRow.amountCurrent).toFixed(2)}</span>
                            </div>
                            <div className="bg-muted/30 border p-2.5 rounded-lg">
                              <span className="text-muted-foreground text-[9px] block uppercase tracking-wider font-sans mb-1">1 - 30 Days</span>
                              <span className="font-bold text-foreground">{Number(liveDuesRow.amount1To30).toFixed(2)}</span>
                            </div>
                            <div className="bg-muted/30 border p-2.5 rounded-lg">
                              <span className="text-muted-foreground text-[9px] block uppercase tracking-wider font-sans mb-1">31 - 60 Days</span>
                              <span className="font-bold text-amber-600">{Number(liveDuesRow.amount31To60).toFixed(2)}</span>
                            </div>
                            <div className="bg-muted/30 border p-2.5 rounded-lg">
                              <span className="text-muted-foreground text-[9px] block uppercase tracking-wider font-sans mb-1">61+ Critical</span>
                              <span className={`font-bold ${Number(liveDuesRow.amount61Plus) > 0 ? "text-rose-600 font-extrabold animate-pulse" : "text-muted-foreground"}`}>
                                {Number(liveDuesRow.amount61Plus).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Vendor Catalog / Vendor Items Table Card */}
                  <Card className="shadow-3xs">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xs font-bold flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" /> Vendor Supplied Items
                          </CardTitle>
                          <CardDescription className="text-[10px]">
                            Mapped catalog products and contracted supplier pricing for this vendor.
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {partner.vendor?.vendorItems?.length || 0} Items
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!partner.vendor?.vendorItems || partner.vendor.vendorItems.length === 0 ? (
                        <div className="text-muted-foreground italic text-center py-6 text-xs bg-muted/20 border rounded-lg">
                          No vendor item mappings linked to this vendor profile.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground">
                                <th className="p-2.5 font-bold">Product Name</th>
                                <th className="p-2.5 font-bold">System SKU</th>
                                <th className="p-2.5 font-bold">Vendor SKU</th>
                                <th className="p-2.5 font-bold text-right">Unit Cost</th>
                                <th className="p-2.5 font-bold text-right">Lead Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {partner.vendor.vendorItems.map((item: any) => (
                                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="p-2.5 font-medium text-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{item.product?.name || "Unlinked Product"}</span>
                                    </div>
                                  </td>
                                  <td className="p-2.5 font-mono text-[11px] text-muted-foreground">
                                    {item.product?.sku || "N/A"}
                                  </td>
                                  <td className="p-2.5 font-mono text-[11px] text-slate-700">
                                    {item.vendorSku ? (
                                      <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                                        {item.vendorSku}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground italic">—</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 font-mono font-bold text-right text-emerald-600">
                                    {item.unitCost != null
                                      ? `${Number(item.unitCost).toLocaleString("en-US", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 4,
                                        })} ${vendorCurrency}`
                                      : "—"}
                                  </td>
                                  <td className="p-2.5 font-mono text-right text-slate-600">
                                    {item.leadTimeDays ? `${item.leadTimeDays}d` : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </div>
  );
}