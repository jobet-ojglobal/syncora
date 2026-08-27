"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Field, FieldLabel } from "../ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

interface DataTablePaginationProps {
  pageIndex: number     // 0-indexed current page (from TanStack state)
  pageSize: number
  pageCount: number     // Total number of pages from server response
  totalRecords: number
  loading?: boolean
  onPageChange: (pageIndex: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

export function DataTablePagination({
  pageIndex,
  pageSize,
  pageCount,
  totalRecords,
  loading = false,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  
  // Logic to compute which specific index items to render
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const siblingCount = 1 // How many items to show immediately beside active index
    
    // Total numbers to show in control block before compressing
    const totalBlocks = siblingCount * 2 + 5 

    if (pageCount <= totalBlocks) {
      for (let i = 0; i < pageCount; i++) pages.push(i)
    } else {
      const leftSiblingIndex = Math.max(pageIndex - siblingCount, 1)
      const rightSiblingIndex = Math.min(pageIndex + siblingCount, pageCount - 2)

      const showLeftEllipsis = leftSiblingIndex > 2
      const showRightEllipsis = rightSiblingIndex < pageCount - 3

      // Always show first page item
      pages.push(0)

      if (showLeftEllipsis) {
        pages.push("left-ellipsis")
      } else {
        for (let i = 1; i < leftSiblingIndex; i++) pages.push(i)
      }

      // Render middle section nodes
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        pages.push(i)
      }

      if (showRightEllipsis) {
        pages.push("right-ellipsis")
      } else {
        for (let i = rightSiblingIndex + 1; i < pageCount - 1; i++) pages.push(i)
      }

      // Always show absolute last page item
      pages.push(pageCount - 1)
    }

    return pages
  }

  if (pageCount <= 1 && totalRecords === 0) return null

  return (
    <div className="flex items-center justify-between gap-4 py-2 flex-col sm:flex-row">
      {/* Records Total Metrics Summary indicator bar */}
      <div className="flex-1 text-sm text-muted-foreground order-2 sm:order-1">
        Showing Page <span className="font-medium text-foreground">{pageIndex + 1}</span> of{" "}
        <span className="font-medium text-foreground">{pageCount}</span> ({totalRecords} items total)
      </div>
      {onPageSizeChange && (
        <div className="flex items-center space-x-6 lg:space-x-8 order-1 sm:order-2">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="500">500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Dynamic Page Buttons Panel Container */}
      <div className="flex items-center gap-1.5 order-1 sm:order-2">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={pageIndex === 0 || loading}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Generated Page / Ellipses Buttons Block Loop */}
        {getPageNumbers().map((page, index) => {
          if (typeof page === "string") {
            return (
              <div
                key={`ellipsis-${index}`}
                className="flex h-8 w-8 items-center justify-center text-muted-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </div>
            )
          }

          const isCurrentPage = page === pageIndex

          return (
            <Button
              key={`page-${page}`}
              variant={isCurrentPage ? "default" : "outline"}
              className="h-8 w-8 p-0 text-xs font-medium"
              onClick={() => onPageChange(page)}
              disabled={loading}
            >
              {page + 1}
            </Button>
          )
        })}

        {/* Next Button */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={pageIndex >= pageCount - 1 || loading}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}