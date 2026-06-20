"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState, // 🟢 Import visibility types
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableMultiSelect } from "@/components/shared/data-table-multi-select"
import { ParsedProduct } from "./columns"

// 🟢 Import standard Shadcn Dropdown components for visibility controls
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SlidersHorizontal } from "lucide-react"

interface DataTableProps<TData extends ParsedProduct, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading?: boolean
  onRowDataUpdate?: (inflowId: string, updatedFields: Partial<TData>) => void
  onRowDelete?: (id: string) => void
}

export function ProductDataTable<TData extends ParsedProduct, TValue>({
  columns,
  data,
  loading = false,
  onRowDataUpdate,
  onRowDelete,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  
  // 🟢 Define initial state mapping: explicit false values will be hidden on load
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    purchasingUomText: false,
    salesUomText: false,
    tracking: false,
  })

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility, // 🟢 Register visibility hook state change
    state: {
      sorting,
      columnFilters,
      columnVisibility, // 🟢 Inject active visibility visibility map
    },
    meta: {
      updateRowData: (inflowId: string, isActive: boolean) => {
        if (onRowDataUpdate) {
          onRowDataUpdate(inflowId, { isActive } as Partial<TData>)
        }
      },
      deleteRowFromState: (id: string) => {
        if (onRowDelete) {
          onRowDelete(id)
        }
      }
    },
  })

  const brandOptions = React.useMemo(() => {
    const uniqueBrands = new Set<string>()
    data.forEach((item) => {
      if (item.brandName) uniqueBrands.add(item.brandName)
    })
    return Array.from(uniqueBrands).map((brand) => ({
      label: brand,
      value: brand,
    }))
  }, [data])

  const categoryOptions = React.useMemo(() => {
    const uniqueCategories = new Set<string>()
    data.forEach((item) => {
      if (item.categoryName) uniqueCategories.add(item.categoryName)
    })
    return Array.from(uniqueCategories).map((category) => ({
      label: category,
      value: category,
    }))
  }, [data])

  return (
    <div className="space-y-4 w-full">
      {/* Filters Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2 w-full max-w-xl">
          <Input
            placeholder="Search products..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="max-w-sm h-9"
          />
          
          {table.getColumn("brandName") && (
            <DataTableMultiSelect
              column={table.getColumn("brandName")}
              title="Brands"
              options={brandOptions}
            />
          )}
          {table.getColumn("categoryName") && (
            <DataTableMultiSelect
              column={table.getColumn("categoryName")}
              title="Category"
              options={categoryOptions}
            />
          )}
        </div>

        {/* Action Controls Section */}
        <div className="flex items-center gap-3">
          {/* 🟢 Add Columns View Toggler Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 ml-auto flex gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {/* Convert camelCase column keys to reader-friendly display text labels */}
                      {column.id.replace(/([A-Z])/g, " $1")}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="text-sm text-muted-foreground whitespace-nowrap">
            Total Records: {data.length}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  {/* 🟢 CRITICAL: Calculate column span using table instance state dynamically */}
                  {table.getVisibleFlatColumns().map((_, colIndex) => (
                    <TableCell key={`cell-${colIndex}`} className="py-4">
                      <div className="h-5 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleFlatColumns().length} className="h-24 text-center">
                  No matching product configurations discovered.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Bar */}
      <div className="flex items-center justify-end space-x-2 py-2">
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