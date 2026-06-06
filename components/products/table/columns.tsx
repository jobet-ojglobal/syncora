"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ProductRow } from "@/types/product";

export const columns: ColumnDef<ProductRow>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
  },
  {
    accessorKey: "name",
    header: "Product",
  },
  {
    accessorKey: "brand.name",
    header: "Brand",
  },
  {
    accessorKey: "standardUomName",
    header: "UOM",
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) =>
      row.original.isActive
        ? "Active"
        : "Inactive",
  },
];