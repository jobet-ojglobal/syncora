"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TrashItem } from "@/actions/trash"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RefreshCw, Trash2, AlertTriangle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
          {/* Restore Button */}
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 text-xs font-medium"
            onClick={() => meta.restoreRow(item.id, item.modelType)}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Restore
          </Button>

          {/* Purge / Delete Confirmation Dialog */}
          {/* { item.modelType !== "LOC" && ( */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              
              <AlertDialogContent className="max-w-md rounded-xl">
                <AlertDialogHeader>
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0 mb-2">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <AlertDialogTitle className="text-left">
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-left text-sm text-muted-foreground mt-1">
                    This will permanently delete <span className="font-semibold text-foreground">&quot;{item.title}&quot;</span>. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
                  <AlertDialogCancel asChild>
                    <Button variant="outline" size="sm" className="h-9 rounded-xl">
                      Cancel
                    </Button>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-9 min-w-[100px] rounded-xl"
                      onClick={() => meta.purgeRow(item.id, item.modelType)}
                    >
                      Confirm Delete
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          {/* )} */}
        </div>
      )
    }
  }
]