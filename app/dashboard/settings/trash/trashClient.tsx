"use client"

import React, { useState, useEffect } from "react"
import { SortingState, ColumnFiltersState } from "@tanstack/react-table"
import { toast } from "sonner"
import { TrashDataTable } from "@/components/trash/data-table"
import { permanentDeleteItem, restoreItem } from "@/actions/trash-mutations"
import { TrashItem } from "@/actions/trash"
import { columns } from "@/components/trash/columns"

interface TrashClientProps {
  initialData: TrashItem[]
}

export function TrashClient({ initialData }: TrashClientProps) {
  // Data State
  const [data, setData] = useState<TrashItem[]>(initialData)
  const [loading, setLoading] = useState(false)

  // Table Control States (Passed down to TrashDataTable)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  // Note: In a production app with thousands of deleted records, you would wire a 
  // useEffect here to re-fetch from getGlobalTrash() whenever these states change.
  // For now, we apply client-side slicing mimicking server-side pagination.
  
  const filteredData = React.useMemo(() => {
    let result = [...data]
    
    // Apply Text Filter
    const searchFilter = columnFilters.find(f => f.id === "title")?.value as string
    if (searchFilter) {
      result = result.filter(item => item.title.toLowerCase().includes(searchFilter.toLowerCase()))
    }
    
    // Apply Entity Filter
    const typeFilter = columnFilters.find(f => f.id === "modelType")?.value as string
    if (typeFilter && typeFilter !== "all") {
      result = result.filter(item => item.modelType === typeFilter)
    }

    return result
  }, [data, columnFilters])

  const paginatedData = filteredData.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  )

  const pageCount = Math.ceil(filteredData.length / pagination.pageSize)

  // --- Handlers ---
  
  const handleRowRestore = async (id: string, modelType: string) => {
    setLoading(true)
    const res = await restoreItem(id, modelType)
    if (!res.error) {
      setData(prev => prev.filter(item => item.id !== id))
      toast.success(`${modelType} restored successfully.`)
    } else {
      toast.error("Restore failed", { description: res.error })
    }
    setLoading(false)
  }

  const handleRowPurge = async (id: string, modelType: string) => {
    if (!confirm(`Permanently delete this ${modelType}?`)) return
    setLoading(true)
    const res = await permanentDeleteItem(id, modelType)
    if (!res.error) {
      setData(prev => prev.filter(item => item.id !== id))
      toast.success("Record permanently deleted.")
    } else {
      toast.error("Purge failed", { description: res.error })
    }
    setLoading(false)
  }

  const handleBulkRestore = async (items: { id: string, modelType: string }[]) => {
    setLoading(true)
    let successCount = 0
    // Using Promise.all for parallel execution. For massive datasets, use a dedicated bulk API.
    await Promise.all(items.map(async (item) => {
      const res = await restoreItem(item.id, item.modelType)
      if (!res.error) successCount++
    }))
    
    const restoredIds = items.map(i => i.id)
    setData(prev => prev.filter(item => !restoredIds.includes(item.id)))
    toast.success(`Successfully restored ${successCount} records.`)
    setLoading(false)
  }

  const handleBulkPurge = async (items: { id: string, modelType: string }[]) => {
    if (!confirm(`Permanently obliterate ${items.length} records? This cannot be undone.`)) return
    setLoading(true)
    let successCount = 0
    await Promise.all(items.map(async (item) => {
      const res = await permanentDeleteItem(item.id, item.modelType)
      if (!res.error) successCount++
    }))
    
    const purgedIds = items.map(i => i.id)
    setData(prev => prev.filter(item => !purgedIds.includes(item.id)))
    toast.success(`Permanently deleted ${successCount} records.`)
    setLoading(false)
  }

  return (
    <TrashDataTable
      columns={columns}
      data={paginatedData}
      loading={loading}
      totalRecords={filteredData.length}
      pageCount={pageCount}
      sorting={sorting}
      onSortingChange={setSorting}
      columnFilters={columnFilters}
      onColumnFiltersChange={setColumnFilters}
      pagination={pagination}
      onPaginationChange={setPagination}
      onRowRestore={handleRowRestore}
      onRowPurge={handleRowPurge}
      onBulkRestore={handleBulkRestore}
      onBulkPurge={handleBulkPurge}
    />
  )
}