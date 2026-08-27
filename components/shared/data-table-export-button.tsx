"use client"

import * as React from "react"
import { Download, Loader2, FileSpreadsheet, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableExportButtonProps {
  selectedIds: string[]
  columnFilters: { id: string; value: unknown }[]
}

export function DataTableExportButton({ selectedIds, columnFilters }: DataTableExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false)

  const triggerDownload = async (exportType: "selected" | "all", target: "details" | "images") => {
    try {
      setIsExporting(true)
      const params = new URLSearchParams()

      // Target specification
      params.append("type", target)

      if (exportType === "selected" && selectedIds.length > 0) {
        params.append("ids", selectedIds.join(","))
      } else {
        const search = (columnFilters.find((f) => f.id === "name")?.value as string) || ""
        const status = (columnFilters.find((f) => f.id === "isActive")?.value as string) || ""
        const selectedBrands = (columnFilters.find((f) => f.id === "brandName")?.value as string[]) || []
        const selectedCategories = (columnFilters.find((f) => f.id === "categoryName")?.value as string[]) || []

        if (search) params.append("search", search)
        if (status && status !== "all") params.append("status", status)
        if (selectedBrands.length > 0) params.append("brands", selectedBrands.join(","))
        if (selectedCategories.length > 0) params.append("categories", selectedCategories.join(","))
      }

      const response = await fetch(`/api/admin/products/export?${params.toString()}`)
      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `products-${target}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export Error:", error)
      alert("Failed to export product data. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const hasSelection = selectedIds.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2" disabled={isExporting}>
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[230px]">
        {/* Selected Rows Section */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex justify-between items-center text-xs">
            <span>Selected Rows</span>
            {hasSelection && (
              <span className="bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded text-[10px]">
                {selectedIds.length}
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuItem
            disabled={!hasSelection || isExporting}
            onClick={() => triggerDownload("selected", "details")}
            className="cursor-pointer gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
            <span>Product Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasSelection || isExporting}
            onClick={() => triggerDownload("selected", "images")}
            className="cursor-pointer gap-2"
          >
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <span>Product Images</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* All Filtered Records Section */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs">All Filtered Rows</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={isExporting}
            onClick={() => triggerDownload("all", "details")}
            className="cursor-pointer gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
            <span>Product Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isExporting}
            onClick={() => triggerDownload("all", "images")}
            className="cursor-pointer gap-2"
          >
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <span>Product Images</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// "use client"

// import * as React from "react"
// import { Download, Check, Loader2 } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"

// interface DataTableExportButtonProps {
//   selectedIds: string[]
//   columnFilters: { id: string; value: unknown }[]
// }

// export function DataTableExportButton({ selectedIds, columnFilters }: DataTableExportButtonProps) {
//   const [isExporting, setIsExporting] = React.useState(false)

//   const triggerDownload = async (exportType: "selected" | "all") => {
//     try {
//       setIsExporting(true)
//       const params = new URLSearchParams()

//       if (exportType === "selected" && selectedIds.length > 0) {
//         params.append("ids", selectedIds.join(","))
//       } else {
//         // Pass existing table query filter states for "Export All"
//         const search = (columnFilters.find((f) => f.id === "name")?.value as string) || ""
//         const status = (columnFilters.find((f) => f.id === "isActive")?.value as string) || ""
//         const selectedBrands = (columnFilters.find((f) => f.id === "brandName")?.value as string[]) || []
//         const selectedCategories = (columnFilters.find((f) => f.id === "categoryName")?.value as string[]) || []

//         if (search) params.append("search", search)
//         if (status && status !== "all") params.append("status", status)
//         if (selectedBrands.length > 0) params.append("brands", selectedBrands.join(","))
//         if (selectedCategories.length > 0) params.append("categories", selectedCategories.join(","))
//       }

//       const response = await fetch(`/api/admin/products/export?${params.toString()}`)
//       if (!response.ok) throw new Error("Export failed")

//       // Trigger automatic browser file download
//       const blob = await response.blob()
//       const url = window.URL.createObjectURL(blob)
//       const a = document.createElement("a")
//       a.href = url
//       a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`
//       document.body.appendChild(a)
//       a.click()
//       a.remove()
//       window.URL.revokeObjectURL(url)
//     } catch (error) {
//       console.error("Export Error:", error)
//       alert("Failed to export products. Please try again.")
//     } finally {
//       setIsExporting(false)
//     }
//   }

//   const hasSelection = selectedIds.length > 0

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="outline" size="sm" className="h-9 gap-2" disabled={isExporting}>
//           {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
//           Export CSV
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent align="end" className="w-[210px]">
//         <DropdownMenuLabel>Export Options</DropdownMenuLabel>
//         <DropdownMenuSeparator />
        
//         <DropdownMenuItem
//           disabled={!hasSelection || isExporting}
//           onClick={() => triggerDownload("selected")}
//           className="flex justify-between items-center cursor-pointer"
//         >
//           <span>Export Selected</span>
//           {hasSelection && (
//             <span className="text-xs bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded">
//               {selectedIds.length}
//             </span>
//           )}
//         </DropdownMenuItem>

//         <DropdownMenuItem
//           disabled={isExporting}
//           onClick={() => triggerDownload("all")}
//           className="cursor-pointer"
//         >
//           Export All (Filtered)
//         </DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   )
// }