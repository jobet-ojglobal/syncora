"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TrashItem } from "@/actions/trash"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RefreshCw, Trash2 } from "lucide-react"

export const columns: ColumnDef<TrashItem>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: "Record Name",
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>
  },
  {
    accessorKey: "modelType",
    header: "Entity Type",
    cell: ({ row }) => (
      <span className="px-2.5 py-1 bg-muted border rounded-md text-xs font-semibold text-muted-foreground">
        {row.original.modelType}
      </span>
    )
  },
  {
    accessorKey: "deletedAt",
    header: "Deleted On",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.deletedAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const item = row.original;
      // Extract meta hooks passed from the table component
      const meta = table.options.meta as {
        restoreRow: (id: string, modelType: string) => void;
        purgeRow: (id: string, modelType: string) => void;
      };

      return (
        <div className="flex gap-2 justify-end">
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={() => meta.restoreRow(item.id, item.modelType)}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Restore
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => meta.purgeRow(item.id, item.modelType)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  }
]