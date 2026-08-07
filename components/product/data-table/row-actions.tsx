"use client"

import Link from "next/link"
import { Row, Table } from "@tanstack/react-table"
import { Edit3, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ParsedProduct } from "./columns"

// 🟢 Import your existing project delete button component
import { DeleteButton } from "@/components/shared/delete-button" 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RowActionsProps {
  row: Row<ParsedProduct>
  table: Table<ParsedProduct>
}

export function RowActions({ row, table }: RowActionsProps) {
  const product = row.original

  return (
    // <div className="flex items-center justify-end gap-1">
    //   {/* 🟢 Edit Action Button */}
    //   <Button 
    //     asChild 
    //     variant="ghost" 
    //     size="icon" 
    //     className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" 
    //     title={`Modify ${product.name}`}
    //   >
    //     <Link href={`/dashboard/products/${product.id}/edit`}>
    //       <Edit3 className="w-3.5 h-3.5" />
    //     </Link>
    //   </Button>

    //   {/* 🟢 Delete Button Hooked directly into table metadata stream */}
    //   <DeleteButton
    //     itemId={product.id}
    //     itemName={product.name}
    //     endpointUrl={`/api/admin/products/${product.id}`}
    //     onSuccess={() => {
    //       const deleteFn = (table.options.meta as any)?.deleteRowFromState
    //       if (deleteFn) {
    //         deleteFn(product.id)
    //       }
    //     }}
    //     variant="icon"
    //   />
    // </div>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(product.inflowId)}
        >
          Copy Inflow ID
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/products/${product.id}/edit`}>
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" asChild>
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
            variant="full"
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}