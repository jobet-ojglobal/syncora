"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Barcode, CalendarClock, ImageOff, Power, PowerOff, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { CellAction } from "./status-cell-action"
import { RowActions } from "./row-actions"

// Shape matching your API Map payload precisely
export type ParsedProduct = {
  id: string
  inflowId: string | null
  sku: string
  name: string
  groupName?: string
  slug: string
  itemType: string
  isActive: boolean
  trackExpiry: boolean
  trackLots: boolean
  trackSerials: boolean
  brandName: string
  categoryName: string
  thumbnail: string | null
  barcodesCount: number
  primaryBarcode: string | null
  purchasingUomText: string
  salesUomText: string
}

export const columns: ColumnDef<ParsedProduct>[] = [
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row, table }) => <CellAction row={row} table={table} />,
  },
  {
    accessorKey: "thumbnail",
    header: "Img",
    cell: ({ row }) => {
      const src = row.getValue("thumbnail") as string | null
      return (
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted overflow-hidden">
          {src ? (
            <Image
              src={src}
              alt={row.getValue("name") || "Product Image"}
              fill
              sizes="40px"
              className="object-cover"
              unoptimized // Use if referencing raw external URL addresses directly
            />
          ) : (
            <ImageOff className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "sku",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4 h-8"
      >
        SKU
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-mono font-medium">{row.getValue("sku")}</span>,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4 h-8"
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      const group = row.original.groupName
      return (
        <div className="flex flex-col max-w-[240px] truncate">
          <span className="font-medium truncate">{name}</span>
          {group && <span className="text-xs text-muted-foreground truncate">Group: {group}</span>}
        </div>
      )
    },
  },
  {
    accessorKey: "categoryName",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="outline" className="bg-background text-xs font-normal max-w-[140px] truncate shadow-2xs">
        {row.getValue("categoryName")}
      </Badge>
    ) ,
  },
  {
    accessorKey: "brandName",
    header: "Brand",
    cell: ({ row }) => {
      const name = row.getValue("brandName") as string
      return (
        <span className="block font-normal text-foreground truncate max-w-[150px]" title={name}>
          {name}
        </span>
      )
    },
  },
  {
    accessorKey: "primaryBarcode",
    header: "Primary Code Reference",
    cell: ({ row }) => {
        const barcode = row.getValue("primaryBarcode") as string;
        const count = row.original.barcodesCount
      return(
        <>
          {barcode ? (
            <div className="flex items-center gap-1">
              <Barcode className="w-3.5 h-3.5 text-muted-foreground/60" />
              <span className="text-[11px] font-medium text-foreground">{barcode}</span>
              {count > 1 && (
                <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1 rounded-sm">
                  +{count - 1}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground/40 italic text-[11px]">No GTIN mapped</span>
          )}
        </>
      )
    }
  },
  {
    accessorKey: "itemType",
    header: "Item Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="bg-background text-xs font-normal max-w-[140px] truncate shadow-2xs">
        {row.getValue("itemType")}
      </Badge>
    ) ,
  },
  {
    accessorKey: "purchasingUomText",
    header: "Purchasing UOM",
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono tracking-tight bg-slate-50 dark:bg-slate-900">
        {row.getValue("purchasingUomText")}
      </Badge>
    ),
  },
  {
    accessorKey: "salesUomText",
    header: "Sales UOM",
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono tracking-tight bg-slate-50 dark:bg-slate-900">
        {row.getValue("salesUomText")}
      </Badge>
    ),
  },
  { 
    accessorKey: "tracking", 
    header: "Traceability Rules",
    cell: ({ row }) => {
      const p = row.original
      return (
        <div className="flex flex-wrap gap-1 max-w-[150px]">
            {p.trackLots && (
            <Badge className="bg-purple-50 text-purple-600 hover:bg-purple-50 border border-purple-200 text-[9px] py-0 h-4 px-1">
                LOTS
            </Badge>
            )}
            {p.trackSerials && (
            <Badge className="bg-indigo-50 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 text-[9px] py-0 h-4 px-1">
                SERIALS
            </Badge>
            )}
            {p.trackExpiry && (
            <Badge className="bg-amber-50 text-amber-600 hover:bg-amber-50 border border-amber-200 text-[9px] py-0 h-4 px-1 inline-flex items-center gap-0.5">
                <CalendarClock className="w-2.5 h-2.5" /> EXPIRY
            </Badge>
            )}
            {!p.trackLots && !p.trackSerials && !p.trackExpiry && (
            <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1 italic">
                <ShieldCheck className="w-3 h-3 opacity-60 text-emerald-500" /> Standard
            </span>
            )}
        </div>
      )
    }
  },
  {
    id: "actions",
    enableHiding: false, // Don't let users hide the core controls column
    cell: ({ row, table }) => <RowActions row={row} table={table} />,
  },
]