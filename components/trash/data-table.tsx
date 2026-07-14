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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SlidersHorizontal, RefreshCw, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTablePagination } from "@/components/shared/data-table-pagination"
import { TrashItem } from "@/actions/trash"

// Define the expected shape of your Trash items
// interface TrashItem {
//   id: string;
//   title: string;
//   modelType: TrashItem["modelType"];
//   deletedAt: Date;
// }

interface TrashDataTableProps<TData extends TrashItem, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading?: boolean
  
  // Server state parameters
  pageCount: number
  totalRecords: number
  
  // State control hooks
  sorting: SortingState
  onSortingChange: React.Dispatch<React.SetStateAction<SortingState>>
  columnFilters: ColumnFiltersState
  onColumnFiltersChange: React.Dispatch<React.SetStateAction<ColumnFiltersState>>
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>

  // Row & Bulk mutation bubbles
  onRowRestore?: (id: string, modelType: TrashItem["modelType"]) => void
  onRowPurge?: (id: string, modelType: TrashItem["modelType"]) => void
  onBulkRestore?: (items: {id: string, modelType: TrashItem["modelType"]}[]) => void
  onBulkPurge?: (items: {id: string, modelType: TrashItem["modelType"]}[]) => void
}

export function TrashDataTable<TData extends TrashItem, TValue>({
  columns,
  data,
  loading = false,
  pageCount,
  totalRecords,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  pagination,
  onPaginationChange,
  onRowRestore,
  onRowPurge,
  onBulkRestore,
  onBulkPurge
}: TrashDataTableProps<TData, TValue>) {

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    pageCount, 
    manualPagination: true, 
    manualSorting: true,    
    manualFiltering: true,  
    
    getCoreRowModel: getCoreRowModel(),
    
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
      restoreRow: (id: string, modelType: TrashItem["modelType"]) => {
        if (onRowRestore) onRowRestore(id, modelType)
      },
      purgeRow: (id: string, modelType: TrashItem["modelType"]) => {
        if (onRowPurge) onRowPurge(id, modelType)
      }
    },
  })

  // 1. Search Debounce Setup
  const currentSearchValue = (columnFilters.find((f) => f.id === "title")?.value as string) ?? ""
  const [localSearch, setLocalSearch] = React.useState(currentSearchValue)

  React.useEffect(() => {
    setLocalSearch(currentSearchValue)
  }, [currentSearchValue])

  React.useEffect(() => {
    if (localSearch === currentSearchValue) return
    const timer = setTimeout(() => {
      onColumnFiltersChange((prev) => {
        const filtered = prev.filter((f) => f.id !== "title")
        if (localSearch) return [...filtered, { id: "title", value: localSearch }]
        return filtered
      })
      onPaginationChange((prev) => ({ ...prev, pageIndex: 0 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, onColumnFiltersChange, onPaginationChange, currentSearchValue])

  // 2. Filter Setup
  const currentModelTypeValue = (columnFilters.find((f) => f.id === "modelType")?.value as string) ?? "all"
  const selectedRows = table.getFilteredSelectedRowModel().rows

  // 3. Bulk Handlers
  const handleBulkRestoreAction = () => {
    if (!onBulkRestore) return
    const items = selectedRows.map((row) => ({ id: row.original.id, modelType: row.original.modelType }))
    onBulkRestore(items)
    table.resetRowSelection()
  }

  const handleBulkPurgeAction = () => {
    if (!onBulkPurge) return
    const items = selectedRows.map((row) => ({ id: row.original.id, modelType: row.original.modelType }))
    onBulkPurge(items)
    table.resetRowSelection()
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex-1 text-sm text-muted-foreground">
        {selectedRows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>

      {/* Filters & Bulk Actions Toolbar */}
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex flex-1 items-center gap-2">
          <Input
            placeholder="Search deleted items..."
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            className="max-w-sm h-9"
          />

          <Select
            value={currentModelTypeValue}
            onValueChange={(value) => {
              onColumnFiltersChange((prev) => {
                const filtered = prev.filter((f) => f.id !== "modelType")
                if (value !== "all") return [...filtered, { id: "modelType", value }]
                return filtered
              })
              onPaginationChange((prev) => ({ ...prev, pageIndex: 0 }))
            }}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="Product">Products</SelectItem>
              <SelectItem value="Category">Categories</SelectItem>
              <SelectItem value="Brand">Brands</SelectItem>
              <SelectItem value="Taxing Scheme">Taxing Schemes</SelectItem>
              <SelectItem value="Tax Code">Tax Codes</SelectItem>
            </SelectContent>
          </Select>

          {/* Bulk Action Buttons (Appear when rows are selected) */}
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 ml-2 animate-in fade-in duration-200">
              <Button variant="outline" size="sm" className="h-9" onClick={handleBulkRestoreAction}>
                <RefreshCw className="h-3.5 w-3.5 mr-2" /> Restore ({selectedRows.length})
              </Button>
              <Button variant="destructive" size="sm" className="h-9" onClick={handleBulkPurgeAction}>
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Purge ({selectedRows.length})
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
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

          <div className="text-sm text-muted-foreground whitespace-nowrap">
            Total Records: {totalRecords}
          </div>
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
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                  No deleted entities match your search criteria.
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