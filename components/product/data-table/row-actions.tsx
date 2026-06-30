"use client"

import Link from "next/link"
import { Row, Table } from "@tanstack/react-table"
import { Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ParsedProduct } from "./columns"

// 🟢 Import your existing project delete button component
import { DeleteButton } from "@/components/shared/delete-button" 

interface RowActionsProps {
  row: Row<ParsedProduct>
  table: Table<ParsedProduct>
}

export function RowActions({ row, table }: RowActionsProps) {
  const product = row.original

  return (
    <div className="flex items-center justify-end gap-1">
      {/* 🟢 Edit Action Button */}
      <Button 
        asChild 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" 
        title={`Modify ${product.name}`}
      >
        <Link href={`/dashboard/products/${product.id}/edit`}>
          <Edit3 className="w-3.5 h-3.5" />
        </Link>
      </Button>

      {/* 🟢 Delete Button Hooked directly into table metadata stream */}
      <DeleteButton
        itemId={product.id}
        itemName={product.name}
        endpointUrl={`/api/admin/products/${product.id}`}
        onSuccess={() => {
          const deleteFn = (table.options.meta as any)?.deleteRowFromState
          if (deleteFn) {
            deleteFn(product.id)
          }
        }}
        variant="icon"
      />
    </div>
  )
}