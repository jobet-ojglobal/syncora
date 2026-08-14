"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
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

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SlidersHorizontal } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTablePagination } from "@/components/shared/data-table-pagination"
import { DataTableBulkDelete } from "@/components/shared/data-table-bulk-delete"
import { DataTableExportButton } from "@/components/shared/data-table-export-button"

// 🟢 Extend props to receive server control hooks from the parent container
interface DataTableProps<TData extends ParsedProduct, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading?: boolean
  brands: {
    label: string;
    value: string;
  }[]
  categories: {
    label: string;
    value: string;
  }[]
  
  // Server state parameters
  pageCount: number
  totalRecords: number
  
  // Sync states controlled by parent query loops
  sorting: SortingState
  onSortingChange: React.Dispatch<React.SetStateAction<SortingState>>
  columnFilters: ColumnFiltersState
  onColumnFiltersChange: React.Dispatch<React.SetStateAction<ColumnFiltersState>>
  
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>

  // Row mutation bubbles
  onRowDataUpdate?: (inflowId: string, updatedFields: Partial<TData>) => void
  onRowDelete?: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
}

export function ProductDataTable<TData extends ParsedProduct, TValue>({
  columns,
  data,
  loading = false,
  brands: brandOptions,
  categories: categoryOptions,
  pageCount,
  totalRecords,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  pagination,
  onPaginationChange,
  onRowDataUpdate,
  onRowDelete,
  onBulkDelete
}: DataTableProps<TData, TValue>) {

   
  
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    purchasingUomText: false,
    salesUomText: false,
    tracking: false,
    primaryBarcode: false,
  })
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    pageCount, //  Inform TanStack how many theoretical pages exist downstream
    manualPagination: true, //  Disable client-side pagination engine
    manualSorting: true,    //  Disable client-side sorting engine
    manualFiltering: true,  //  Disable client-side filter evaluations
    
    getCoreRowModel: getCoreRowModel(),
    
    // Bind shared functional callbacks
    onSortingChange,
    onColumnFiltersChange,
    onPaginationChange,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
      rowSelection,
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

  // 1. Look up any existing server-side search filter value passed on initialization
  const currentSearchValue = (columnFilters.find((f) => f.id === "name")?.value as string) ?? ""

  // 2. Create local component state to handle immediate text input updates smoothly
  const [localSearch, setLocalSearch] = React.useState(currentSearchValue)

  // 3. Sync local state if parent column filters reset or alter externally
  React.useEffect(() => {
    setLocalSearch(currentSearchValue)
  }, [currentSearchValue])

  // 4. Debounce Engine: Watch local typed input, delay parent sync by 300ms
  React.useEffect(() => {
    // If the input values are already identical, don't trigger anything
    if (localSearch === currentSearchValue) return

    const timer = setTimeout(() => {
      onColumnFiltersChange((prev) => {
        const filtered = prev.filter((f) => f.id !== "name")
        if (localSearch) {
          return [...filtered, { id: "name", value: localSearch }]
        }
        return filtered
      })
      
      // 🟢 Reset to page 1 automatically when search term changes
      onPaginationChange((prev) => ({ ...prev, pageIndex: 0 }))
    }, 300) // 300ms window

    return () => clearTimeout(timer) // Wipe previous timeout if user keys another letter
  }, [localSearch, onColumnFiltersChange, onPaginationChange, currentSearchValue])

  const currentStatusValue = (columnFilters.find((f) => f.id === "isActive")?.value as string) ?? "all"

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedIds = selectedRows.map((row) => row.original.id)

  const handleBulkDeleteExecution = async () => {
    if (!onBulkDelete) return
    const selectedIds = selectedRows.map((row) => row.original.id)
    
    // Bubble up your core API promises to the component shell wrapper
    onBulkDelete(selectedIds)
    table.resetRowSelection() // Wipe column selection checkboxes clean on complete
  }

  const currentCloudSyncValue = (columnFilters.find((f) => f.id === "isCloudSynced")?.value as string) ?? "all";
  const currentLocalSyncValue = (columnFilters.find((f) => f.id === "isLocalSynced")?.value as string) ?? "all";

  return (
    <div className="space-y-4 w-full">

      <div className="flex-1 text-sm text-muted-foreground">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>

      {/* Filters Toolbar */}
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex flex-1 items-center gap-2">
          <Input
            placeholder="Search products..."
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            className="max-w-sm h-9"
          />

          <Select
            value={currentStatusValue}
            onValueChange={(value) => {
              onColumnFiltersChange((prev) => {
                // Clear existing active flags out of tracking state array
                const filtered = prev.filter((f) => f.id !== "isActive")
                
                // Append only if filtering a specific subset value selection
                if (value !== "all") {
                  return [...filtered, { id: "isActive", value }]
                }
                return filtered
              })
              // Reset pagination index view back to page 1 safely
              onPaginationChange((prev) => ({ ...prev, pageIndex: 0 }))
            }}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Archived Only</SelectItem>
            </SelectContent>
          </Select>

          {/* Cloud Sync Filter */}
          <Select
            value={currentCloudSyncValue}
            onValueChange={(value) => {
              onColumnFiltersChange((prev) => {
                const filtered = prev.filter((f) => f.id !== "isCloudSynced");
                if (value !== "all") return [...filtered, { id: "isCloudSynced", value }];
                return filtered;
              });
              onPaginationChange((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Cloud Sync" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cloud Sync: All</SelectItem>
              <SelectItem value="true">Cloud Synced</SelectItem>
              <SelectItem value="false">Cloud Unsynced</SelectItem>
            </SelectContent>
          </Select>

          {/* Local Sync Filter */}
          <Select
            value={currentLocalSyncValue}
            onValueChange={(value) => {
              onColumnFiltersChange((prev) => {
                const filtered = prev.filter((f) => f.id !== "isLocalSynced");
                if (value !== "all") return [...filtered, { id: "isLocalSynced", value }];
                return filtered;
              });
              onPaginationChange((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Local Sync" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Local Sync: All</SelectItem>
              <SelectItem value="true">Local Synced</SelectItem>
              <SelectItem value="false">Local Unsynced</SelectItem>
            </SelectContent>
          </Select>
          
          {table.getColumn("brandName") && (
            <DataTableMultiSelect
              column={table.getColumn("brandName")}
              title="Brands"
              options={brandOptions}
              size="sm"
            />
          )}
          {table.getColumn("categoryName") && (
            <DataTableMultiSelect
              column={table.getColumn("categoryName")}
              title="Category"
              options={categoryOptions}
              size="sm"
            />
          )}
          <DataTableBulkDelete
            selectedCount={selectedRows.length}
            onConfirm={handleBulkDeleteExecution}
          />
        </div>

        <div className="flex items-center gap-3">
          <DataTableExportButton
            selectedIds={selectedIds}
            columnFilters={columnFilters}
          />
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
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id.replace(/([A-Z])/g, " $1")}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table Content Section */}
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
              Array.from({ length: pagination.pageSize }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
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

      

      {/* Pagination Controls */}
      <DataTablePagination
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        pageCount={pageCount}
        totalRecords={totalRecords}
        loading={loading}
        onPageChange={(newPageIndex) => {
          onPaginationChange((prev) => ({ ...prev, pageIndex: newPageIndex }))
        }}
      />
    </div>
  )
}