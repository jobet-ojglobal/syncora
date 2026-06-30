"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ProductRow } from "./types";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Clipboard, ArrowUpDown } from "lucide-react";

export const columns: ColumnDef<ProductRow>[] = [
  {
    accessorKey: "sku",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 data-[state=open]:bg-accent"
        >
          SKU
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <span className="font-mono font-medium text-zinc-600 dark:text-zinc-400">{row.getValue("sku") || "—"}</span>
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 data-[state=open]:bg-accent"
        >
          Product
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <span className="font-medium text-zinc-900 dark:text-zinc-50">{row.getValue("name")}</span>
  },
  {
    id: "price",
    // Use accessorFn so TanStack can sort numeric data correctly instead of treating strings as text
    accessorFn: (row) => row.variant?.defaultPrice ? parseFloat(row.variant.defaultPrice) : 0,
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 data-[state=open]:bg-accent text-right justify-end"
          >
            Price
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const amount = row.getValue("price") as number;
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
 
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorFn: (row) => row.brand?.name,
    id: "brandName",
    header: "Brand",
    cell: ({ row }) => <span>{row.getValue("brandName") || "—"}</span>,
    // Add this to allow matching an item against an array of multiple selected filters
    filterFn: "arrIncludesSome", 
  },
  {
    accessorKey: "standardUomName",
    header: "UOM",
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.getValue("standardUomName") || "—"}</span>
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-emerald-500/20" : ""}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
    // Custom exact filter matching strings coming from our Select Dropdown component to the model booleans
    filterFn: (row, columnId, filterValue) => {
      const rowValue = row.getValue(columnId) as boolean;
      return String(rowValue) === filterValue;
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original;
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(product.sku || "")}
              disabled={!product.sku}
              className="cursor-pointer"
            >
              <Clipboard className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              Copy product SKU
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">View inventory details</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">Archive product</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];