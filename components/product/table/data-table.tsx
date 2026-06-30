"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTableMultiSelect } from "@/components/shared/data-table-multi-select" // Import our new multi-select component
import { ProductRow } from "./types"

interface DataTableProps<TData extends ProductRow, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData extends ProductRow, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
  })

  // Dynamically map unique brands present within your incoming array data source
  const brandOptions = React.useMemo(() => {
    const uniqueBrands = new Set<string>()
    data.forEach((item) => {
      if (item.brand?.name) uniqueBrands.add(item.brand.name)
    })
    return Array.from(uniqueBrands).map((brand) => ({
      label: brand,
      value: brand,
    }))
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        
        {/* Search Inputs and Multi Select Row */}
        <div className="flex flex-1 items-center gap-2 w-full max-w-xl">
          <Input
            placeholder="Search products..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="max-w-sm h-9"
          />
          
          {/* Custom Brand Multi Selector Integration */}
          {table.getColumn("brandName") && (
            <DataTableMultiSelect
              column={table.getColumn("brandName")}
              title="Brands"
              options={brandOptions}
            />
          )}
        </div>
        
        {/* Status Filter Dropdown */}
        <Select
          value={(table.getColumn("isActive")?.getFilterValue() as string) ?? "all"}
          onValueChange={(value) => {
            table.getColumn("isActive")?.setFilterValue(value === "all" ? undefined : value)
          }}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Table Layout */}
      <div className="overflow-hidden rounded-md border bg-white dark:bg-zinc-950">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination Footer */}
      <div className="flex items-center justify-end space-x-2 py-1">
        <div className="flex-1 text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}