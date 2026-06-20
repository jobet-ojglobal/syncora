// app/admin/products/page.tsx
"use client"

import * as React from "react"
import { columns, ParsedProduct } from "@/components/products/data-table/columns"
import { ProductDataTable } from "@/components/products/data-table/server-side-table"
import { ColumnFiltersState, SortingState } from "@tanstack/react-table"
import PageHeader from "@/components/layout/dashboard/PageHeader"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { toast } from "sonner"

interface HydrationPayload {
  brands: any[];
  categories: any[];
}

export default function AdminServerSideProductsPage() {
 // Example configuration logic inside your parent Page component
  const [products, setProducts] = React.useState<ParsedProduct[]>([])
  const [loading, setLoading] = React.useState(true)
  const [pageCount, setPageCount] = React.useState(0)
  const [totalRecords, setTotalRecords] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  // Define structural parameters to pass down cleanly
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  
  const [hydrationData, setHydrationData] = React.useState<HydrationPayload | null>(null);

  React.useEffect(() => {
    async function loadFormRequirements() {
      try {
        // Run all fetch pipelines concurrently to eliminate network waterfall delays
        const [brandRes, catRes] = await Promise.all([
          fetch("/api/admin/brands/basic"),
          fetch("/api/admin/categories/basic"),
        ]);

        if (!brandRes.ok || !catRes.ok) {
          throw new Error("One or more core configuration pipelines failed to download data layers.");
        }

        const [brandData, catData] = await Promise.all([
          brandRes.json(),
          catRes.json(),
        ]);

        // Safely map incoming backend payloads into a unified client state structure
        setHydrationData({
          brands: brandData || [],
          categories: catData || [],
        });
      } catch (err: any) {
        setError(err.message || "Failed hydrating product catalog dependency systems.");
        toast.error("Data Synch Fault", { description: err.message });
      }
    }

    loadFormRequirements();
  }, []);



  React.useEffect(() => {
    async function fetchServerSideData() {
      try {
        setLoading(true)
        const search = columnFilters.find(f => f.id === "name")?.value || ""
        const status = columnFilters.find(f => f.id === "isActive")?.value || ""

        const selectedBrands = (columnFilters.find(f => f.id === "brandName")?.value as string[]) || []
        const selectedCategories = (columnFilters.find(f => f.id === "categoryName")?.value as string[]) || []
        
        let sortBy = ""
        let sortOrder = ""
        if (sorting.length > 0) {
          sortBy = sorting[0].id       // e.g., "sku" or "name"
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
    }

    fetchServerSideData()
  }, [pagination.pageIndex, pagination.pageSize, columnFilters, sorting])



  const handleRowDataUpdate = (inflowId: string, updatedFields: Partial<ParsedProduct>) => {
    setProducts((prevData) =>
      prevData.map((item) =>
        item.inflowId === inflowId ? { ...item, ...updatedFields } : item
      )
    )
  }



  if (error) {
    return (
      <div className="p-8 text-center text-destructive font-medium">
        Error: {error}
      </div>
    )
  }

  const handleRowDelete = (id: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== id))
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-6 space-y-6">
      <PageHeader 
        className=" border-b pb-5" 
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
        brands={
          hydrationData?.brands?.map((b) => ({
            label: b.name,
            value: b.id,
          })) ?? []
        }
        categories={
          hydrationData?.categories?.map((c) => ({
            label: c.name,
            value: c.id,
          })) ?? []
        }

        columns={columns} 
        data={products} 
        loading={loading} 
        onRowDataUpdate={handleRowDataUpdate}
        onRowDelete={handleRowDelete}
        pageCount={pageCount}
        pagination={pagination} // 🟢 FIXED: Pass the actual pagination state object here
        totalRecords={totalRecords}
        sorting={sorting}       // 🟢 Don't forget to pass your active sorting state too!
        onSortingChange={setSorting}
        columnFilters={columnFilters} // 🟢 Don't forget to pass your active columnFilters state too!
        onColumnFiltersChange={setColumnFilters}
        onPaginationChange={setPagination}
      />
    </div>
  )
}