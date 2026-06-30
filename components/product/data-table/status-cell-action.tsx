"use client"

import * as React from "react"
import { Row, Table } from "@tanstack/react-table"
import { Power, PowerOff } from "lucide-react"
import { toast } from "sonner"
import { ParsedProduct } from "./columns"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface CellActionProps {
  row: Row<ParsedProduct>
  table: Table<ParsedProduct>
}

export function CellAction({ row, table }: CellActionProps) {
  const product = row.original
  const active = !!row.getValue("isActive")
  const [isPending, setIsPending] = React.useState(false)

  const handleToggleActiveState = async () => {
    try {
      setIsPending(true)
      const response = await fetch("/api/admin/products/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inflowId: product.inflowId, isActive: !active }),
      })

      if (!response.ok) throw new Error()

      toast.success("Status Synchronized", {
        description: `${product.name} is now ${!active ? "Active" : "Archived"}.`,
      })

      // 🟢 Update data directly through the table instance global meta setter
      const updateDataFn = (table.options.meta as any)?.updateRowData
      if (updateDataFn) {
        updateDataFn(product.inflowId, !active)
      }
    } catch (err) {
      toast.error("State Mutation Exception", {
        description: "Failed to update product status. Please try again.",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          onClick={handleToggleActiveState}
          className={`p-1.5 rounded-md border transition-colors disabled:opacity-50 ${
            active
              ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/20"
              : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/20"
          }`}
        >
          {active ? (
            <Power className={`w-3.5 h-3.5 ${isPending ? "animate-pulse" : ""}`} />
          ) : (
            <PowerOff className={`w-3.5 h-3.5 ${isPending ? "animate-pulse" : ""}`} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{active ? "Click to Deactivate Item" : "Click to Activate Item"}</p>
      </TooltipContent>
    </Tooltip>
  )
}