import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Boxes,
  History,
  QrCode,
  Sliders,
  MapPin,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  ImageIcon,
  ArrowRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { AdjustStockDialog } from "@/components/stock/adjust-stock-dialog";
import { TablePagination } from "@/components/stock/table-pagination";
import { ActionTypeFilter } from "@/components/stock/action-type-filter";
import { SerialActionSearch } from "@/components/stock/serial-action-search";
import { InventorySerialAdjustmentAction, Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 10;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    serialPage?: string;
    ledgerPage?: string;
    actionPage?: string;
    actionType?: string;
    serialQuery?: string;
  }>;
}

export default async function InventoryDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const activeTab = resolvedSearchParams.tab || "bins";
  let serialPage = Math.max(1, parseInt(resolvedSearchParams.serialPage || "1", 10));
  let ledgerPage = Math.max(1, parseInt(resolvedSearchParams.ledgerPage || "1", 10));
  let actionPage = Math.max(1, parseInt(resolvedSearchParams.actionPage || "1", 10));

  const actionTypeFilter = resolvedSearchParams.actionType;
  const serialQuery = resolvedSearchParams.serialQuery?.trim();

  // 1. Fetch core inventory record
  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          inflowId: true,
          name: true,
          slug: true,
          sku: true,
          trackSerials: true,
          images: {
            orderBy: { position: "asc" },
            take: 1,
            select: { thumbUrl: true, originalUrl: true },
          },
        },
      },
      location: {
        select: {
          name: true,
        },
      },
      bins: {
        include: {
          sublocation: {
            select: {
              name: true,
            },
          },
          inventoryBinItems: true,
        },
        orderBy: {
          quantity: "desc",
        },
      },
    },
  });

  if (!inventory) {
    notFound();
  }

  const cleanSerialQuery = serialQuery?.trim();

  // Ensure serialActionWhere accurately targets historical adjustments regardless of current status
  const serialActionWhere: Prisma.InventoryAdjustmentSerialWhereInput = {
    adjustmentLine: {
      productId: inventory.productId,
      locationId: inventory.locationId,
    },
    ...(actionTypeFilter && ["ADD", "REMOVE", "MOVE", "VERIFY"].includes(actionTypeFilter)
      ? { action: actionTypeFilter as InventorySerialAdjustmentAction }
      : {}),
    ...(cleanSerialQuery
      ? {
          serialNumber: {
            contains: cleanSerialQuery,
            mode: "insensitive",
          },
        }
      : {}),
  };
  // First count totals to safely bound pagination pages
  const [totalSerials, totalLedgerEntries, totalSerialAdjustments] = await Promise.all([
    prisma.inventoryBinItem.count({
      where: {
        productId: inventory.productId,
        locationId: inventory.locationId,
      },
    }),
    prisma.inventoryLedger.count({
      where: {
        productId: inventory.productId,
        locationId: inventory.locationId,
      },
    }),
    prisma.inventoryAdjustmentSerial.count({
      where: serialActionWhere,
    }),
  ]);

  const totalSerialPages = Math.ceil(totalSerials / PAGE_SIZE) || 1;
  const totalLedgerPages = Math.ceil(totalLedgerEntries / PAGE_SIZE) || 1;
  const totalActionPages = Math.ceil(totalSerialAdjustments / PAGE_SIZE) || 1;

  // Fix: If a search query is applied, reset to page 1 unless specifically paginating
  const safeActionPage = Math.max(1, Math.min(actionPage, totalActionPages));
  const safeSerialPage = Math.max(1, Math.min(serialPage, totalSerialPages));
  const safeLedgerPage = Math.max(1, Math.min(ledgerPage, totalLedgerPages));

  // Clamp current page if URL page exceeds available bounds (prevents empty search results)
  actionPage = Math.min(actionPage, totalActionPages);
  serialPage = Math.min(serialPage, totalSerialPages);
  ledgerPage = Math.min(ledgerPage, totalLedgerPages);

  // 2. Fetch paginated records
  const [serials, ledgerEntries, serialAdjustments] = await Promise.all([
    prisma.inventoryBinItem.findMany({
      where: {
        productId: inventory.productId,
        locationId: inventory.locationId,
      },
      include: {
        inventoryBin: {
          include: { sublocation: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (safeSerialPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.inventoryLedger.findMany({
      where: {
        productId: inventory.productId,
        locationId: inventory.locationId,
      },
      include: {
        sublocation: true,
        performedBy: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (safeLedgerPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.inventoryAdjustmentSerial.findMany({
      where: serialActionWhere,
      include: {
        adjustmentLine: {
          include: { adjustment: true },
        },
        fromInventoryBin: {
          include: { sublocation: true },
        },
        toInventoryBin: {
          include: { sublocation: true },
        },
      },
      orderBy: {
        id: "desc", // Fallback primary key ordering or use adjustmentLine relation safely
      },
      skip: (safeActionPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  function renderSerialActionBadge(action: "ADD" | "REMOVE" | "MOVE" | "VERIFY") {
    switch (action) {
      case "ADD":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">ADD</Badge>;
      case "REMOVE":
        return <Badge variant="destructive">REMOVE</Badge>;
      case "MOVE":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">MOVE</Badge>;
      case "VERIFY":
        return <Badge variant="secondary">VERIFY</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  }

  const productImage = inventory.product.images[0]?.thumbUrl || inventory.product.images[0]?.originalUrl || null;
  const productName = inventory.product.name;

  const onHand = Number(inventory.quantityOnHand || 0);
  const available = Number(inventory.quantityAvailable || 0);
  const reserved = Number(inventory.quantityReserved || 0);
  const reorderThreshold = Number(inventory.reorderThreshold || 0);
  const isLowStock = available <= reorderThreshold;
  const totalBinQty = inventory.bins.reduce((sum, bin) => sum + Number(bin.quantity), 0);
  const bulkAreaQty = Math.max(0, Number(inventory.quantityOnHand) - totalBinQty);

  const buildTabUrl = (tabName: string) => {
    const params = new URLSearchParams();
    params.set("tab", tabName);
    params.set("serialPage", serialPage.toString());
    params.set("ledgerPage", ledgerPage.toString());
    params.set("actionPage", tabName === "serial-actions" ? "1" : actionPage.toString());

    if (actionTypeFilter) params.set("actionType", actionTypeFilter);
    if (serialQuery) params.set("serialQuery", serialQuery);

    return `?${params.toString()}`;
  };

  const serializedBins = inventory.bins.map((bin) => ({
    ...bin,
    quantity: Number(bin.quantity),
  }));

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      {/* Header & KPI Summary Cards */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/inventory">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Inventory</span>
            </Link>
          </Button>
          <div>
            <div className="flex gap-2 items-center">
              <div className="w-10 h-10 bg-muted border rounded-md overflow-hidden flex items-center justify-center shrink-0 relative">
                {productImage ? (
                  <Image
                    src={productImage}
                    alt={productName}
                    className="w-full h-full object-cover"
                    width={40}
                    height={40}
                  />
                ) : (
                  <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {inventory.product.name}
                </h1>
                {isLowStock && (
                  <Badge variant="destructive" className="flex gap-1 items-center">
                    <AlertTriangle className="h-3 w-3" />
                    Low Stock
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {inventory.location.name}
              <span className="text-muted-foreground/40">•</span>
              <span>SKU: {inventory.product.sku ?? "N/A"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AdjustStockDialog
            inventoryId={inventory.id}
            currentOnHand={onHand}
            bins={serializedBins}
          />
          <Button size="sm">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Transfer Stock
          </Button>
        </div>
      </div>

      <Separator />
      
      {/* KPI Display */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantity On Hand</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onHand.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total physical stock in facility</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {available.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready for allocation and sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {reserved.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Committed to active orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reorder Status</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${isLowStock ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reorderThreshold.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {inventory.isAutoReorderEnabled ? "Auto-reorder enabled" : "Manual reorder required"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Tables */}
      <Tabs defaultValue={activeTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="bins" asChild>
            <Link href={buildTabUrl("bins")} className="flex items-center gap-2">
              <Boxes className="h-4 w-4" /> Bins ({inventory.bins.length})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="serials" asChild>
            <Link href={buildTabUrl("serials")} className="flex items-center gap-2">
              <QrCode className="h-4 w-4" /> Serials ({totalSerials})
            </Link>
          </TabsTrigger>
          <TabsTrigger value="ledger" asChild>
            <Link href={buildTabUrl("ledger")} className="flex items-center gap-2">
              <History className="h-4 w-4" /> Audit Ledger
            </Link>
          </TabsTrigger>
          <TabsTrigger value="serial-actions" asChild>
            <Link href={buildTabUrl("serial-actions")} className="flex items-center gap-2">
              <Sliders className="h-4 w-4" /> Serial Actions ({totalSerialAdjustments})
            </Link>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Bins */}
        <TabsContent value="bins">
          <Card>
            <CardHeader>
              <CardTitle>Bin & Sublocation Breakdown</CardTitle>
              <CardDescription>
                Physical storage distribution across shelf, aisle, or bin sublocations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sublocation</TableHead>
                    <TableHead>Code / Ref</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.bins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No bin assignments mapped. Stock is currently unassigned floor stock.
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventory.bins.map((bin) => (
                      <TableRow key={bin.id}>
                        <TableCell className="font-medium">
                          {bin.sublocation.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {"—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {Number(bin.quantity).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {format(new Date(bin.updatedAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {bulkAreaQty > 0 && (
                    <TableRow className="bg-muted/40 font-medium">
                      <TableCell className="text-muted-foreground">
                        📦 Bulk Area / Unassigned
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        FLOOR
                      </TableCell>
                      <TableCell className="text-right font-semibold text-amber-600 dark:text-amber-400">
                        {bulkAreaQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        Unbinned
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Serials */}
        <TabsContent value="serials">
          <Card>
            <CardHeader>
              <CardTitle>Tracked Serial Items</CardTitle>
              <CardDescription>
                Individual unit items with distinct serial numbers attached to this inventory record.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bin Location</TableHead>
                    <TableHead className="text-right">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No serialized units tracked for this item.
                      </TableCell>
                    </TableRow>
                  ) : (
                    serials.map((serial) => (
                      <TableRow key={serial.id}>
                        <TableCell className="font-mono font-medium">
                          {serial.serialNumber}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              serial.status === "IN_STOCK"
                                ? "default"
                                : serial.status === "RESERVED"
                                ? "outline"
                                : serial.status === "DAMAGED"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {serial.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {serial.inventoryBin?.sublocation.name ?? "Unassigned"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {format(new Date(serial.updatedAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={serialPage}
                totalPages={totalSerialPages}
                pageParamName="serialPage"
                activeTab="serials"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Ledger */}
        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>Movement & Audit Trail</CardTitle>
              <CardDescription>
                Complete log of inventory additions, deductions, transfers, and adjustments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No transaction history logged for this location yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerEntries.map((entry) => {
                      const change = Number(entry.quantityChange);
                      const isPositive = change > 0;

                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {entry.transactionType.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium font-mono ${
                              isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isPositive ? `+${change}` : change}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {Number(entry.quantityAfter).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {entry.performedBy?.name ?? "System"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {entry.remarks ?? entry.referenceType ?? "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={ledgerPage}
                totalPages={totalLedgerPages}
                pageParamName="ledgerPage"
                activeTab="ledger"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Serial Number Action History */}
        <TabsContent value="serial-actions">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Serial Number Action History</CardTitle>
                <CardDescription>
                  Granular audit log of serial status changes, bin moves, additions, and removals.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SerialActionSearch />
                <ActionTypeFilter />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Bin Transfer / Location</TableHead>
                    <TableHead>Adjustment Ref</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serialAdjustments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {serialQuery || actionTypeFilter
                          ? "No serial actions match your search/filter criteria."
                          : "No serial action history logged for this item yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    serialAdjustments.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-medium">
                          {item.serialNumber}
                        </TableCell>
                        <TableCell>{renderSerialActionBadge(item.action)}</TableCell>
                        <TableCell className="text-xs">
                          {item.action === "MOVE" ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <span>{item.fromInventoryBin?.sublocation.name ?? "Floor"}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="font-semibold text-foreground">
                                {item.toInventoryBin?.sublocation.name ?? "Floor"}
                              </span>
                            </div>
                          ) : item.action === "ADD" ? (
                            <span className="text-muted-foreground">
                              Added to {item.toInventoryBin?.sublocation.name ?? "Floor"}
                            </span>
                          ) : item.action === "REMOVE" ? (
                            <span className="text-muted-foreground">
                              Removed from {item.fromInventoryBin?.sublocation.name ?? "Floor"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Verified in place</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.adjustmentLine.adjustment.adjustmentNumber}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {format(new Date(item.adjustmentLine.createdAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={actionPage}
                totalPages={totalActionPages}
                pageParamName="actionPage"
                activeTab="serial-actions"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}