// app/admin/products/page.tsx
"use client"

import * as React from "react"
import { columns, ParsedProduct } from "@/components/product/data-table/columns"
import { ProductDataTable } from "@/components/product/data-table/server-side-table"
import { ColumnFiltersState, SortingState } from "@tanstack/react-table"
import PageHeader from "@/components/layout/dashboard/PageHeader"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Layers, Plus } from "lucide-react"
import { toast } from "sonner"

interface HydrationPayload {
  brands: any[];
  categories: any[];
}

export default function AdminServerSideProductsPage() {
  const [products, setProducts] = React.useState<ParsedProduct[]>([])
  const [loading, setLoading] = React.useState(true)
  const [pageCount, setPageCount] = React.useState(0)
  const [totalRecords, setTotalRecords] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [hydrationData, setHydrationData] = React.useState<HydrationPayload | null>(null)

  // 🟢 1. Core Data Fetching Engine (Extracted out of useEffect)
  const fetchServerSideData = React.useCallback(async () => {
    try {
      setLoading(true)
      const search = columnFilters.find(f => f.id === "name")?.value || ""
      const status = columnFilters.find(f => f.id === "isActive")?.value || ""
      const selectedBrands = (columnFilters.find(f => f.id === "brandName")?.value as string[]) || []
      const selectedCategories = (columnFilters.find(f => f.id === "categoryName")?.value as string[]) || []
      
      let sortBy = ""
      let sortOrder = ""
      if (sorting.length > 0) {
        sortBy = sorting[0].id
        sortOrder = sorting[0].desc ? "desc" : "asc"
      }

      const query = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: String(search),
        brands: selectedBrands.join(","), 
        categories: selectedCategories.join(","),
        status: String(status),
        sortBy,
        sortOrder
      })

      const res = await fetch(`/api/admin/products?${query.toString()}`)
      if (res.ok) {
        const result = await res.json()
        setProducts(result.data)
        setPageCount(result.meta.totalPages)
        setTotalRecords(result.meta.totalRecords)
      }
    } catch (err: any) {
      setError(err.message || "Failed to load catalog data.")
    } finally {
      setLoading(false)
    }
  }, [pagination.pageIndex, pagination.pageSize, columnFilters, sorting])

  // 🟢 2. Primary query watch loop targeting your isolated fetch definition
  React.useEffect(() => {
    fetchServerSideData()
  }, [fetchServerSideData])

  // Hydration Load Phase (Brands / Categories Metadata)
  React.useEffect(() => {
    async function loadFormRequirements() {
      try {
        const [brandRes, catRes] = await Promise.all([
          fetch("/api/admin/brands/basic"),
          fetch("/api/admin/categories/basic"),
        ])

        if (!brandRes.ok || !catRes.ok) {
          throw new Error("One or more core configuration pipelines failed to download data layers.")
        }

        const [brandData, catData] = await Promise.all([brandRes.json(), catRes.json()])

        setHydrationData({
          brands: brandData || [],
          categories: catData || [],
        })
      } catch (err: any) {
        setError(err.message || "Failed hydrating product catalog dependency systems.")
        toast.error("Data Synch Fault", { description: err.message })
      }
    }
    loadFormRequirements()
  }, [])

  const handleRowDataUpdate = (inflowId: string, updatedFields: Partial<ParsedProduct>) => {
    setProducts((prevData) =>
      prevData.map((item) =>
        item.inflowId === inflowId ? { ...item, ...updatedFields } : item
      )
    )
  }

  // 🟢 3. Updated Single Row Delete Handler
  const handleRowDelete = async (id: string) => {
    // If your RowActions triggers an API call first, wait for success, then simply pull new server data:
    await fetchServerSideData()
    // toast.success("Product removed successfully.")
  }

  // 🟢 4. Updated Bulk Delete Handler
  const handleBulkDelete = React.useCallback(async (ids: string[]) => {
    try {
      setLoading(true)

      const response = await fetch("/api/admin/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Failed to process bulk deletion request.")
      }

      toast.success(`Successfully removed ${ids.length} products.`)
      
      // 🟢 Force pageIndex index backward if we just deleted every remaining item on the last page
      const elementsRemaining = products.length - ids.length
      if (elementsRemaining === 0 && pagination.pageIndex > 0) {
        setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))
      } else {
        // 🟢 Execute a fresh fetch to pull replacement items up from next pages and sync total records count
        await fetchServerSideData()
      }

    } catch (error: any) {
      console.error("Bulk delete execution failure:", error)
      toast.error(error.message || "An unexpected processing error occurred.")
      throw error
    } finally {
      setLoading(false)
    }
  }, [products.length, pagination.pageIndex, fetchServerSideData])

  if (error) {
    return <div className="p-8 text-center text-destructive font-medium">Error: {error}</div>
  }

  return (
    <div className="w-full max-w-7xl mx-auto  p-6  space-y-6">
      <PageHeader 
        className="border-b pb-5" 
        icon={Layers}
        title="Master Product Catalog" 
        description="Manage global trade line SKUs, nested barcode structures, multi-tier transactional UOM variables, and active tracking variables." 
        >
        <Button asChild size="sm" className="gap-1.5 shrink-0">
          <Link href="/dashboard/products/create">
            <Plus className="w-4 h-4" /> Register New Product
          </Link>
        </Button>
      </PageHeader>
      
      <ProductDataTable 
        brands={hydrationData?.brands?.map((b) => ({ label: b.name, value: b.id })) ?? []}
        categories={hydrationData?.categories?.map((c) => ({ label: c.name, value: c.id })) ?? []}
        columns={columns} 
        data={products} 
        loading={loading} 
        onRowDataUpdate={handleRowDataUpdate}
        onRowDelete={handleRowDelete}
        onBulkDelete={handleBulkDelete}
        pageCount={pageCount}
        pagination={pagination}
        totalRecords={totalRecords}
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        onPaginationChange={setPagination}
      />
    </div>
  )
}