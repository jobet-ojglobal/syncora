// app/admin/products/page.tsx
"use client"

import * as React from "react"
import { columns, ParsedProduct } from "@/components/products/data-table/columns"
import { ProductDataTable } from "@/components/products/data-table/table"

export default function AdminProductsPage() {
  const [products, setProducts] = React.useState<ParsedProduct[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        const response = await fetch("/api/admin/products")
        if (!response.ok) {
          throw new Error("Pipeline data pull failure event triggered.")
        }
        const data = await response.json()
        setProducts(data)
      } catch (err: any) {
        setError(err.message || "Failed to load catalog data.")
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

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
    <main className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Master Product Catalog</h1>
        <p className="text-sm text-muted-foreground">
          Manage system inventory stock items, barcodes, and dynamic cross-tier conversion configurations.
        </p>
      </div>
      
      <ProductDataTable 
        columns={columns} 
        data={products} 
        loading={loading} 
        onRowDataUpdate={handleRowDataUpdate}
        onRowDelete={handleRowDelete}
      />
    </main>
  )
}