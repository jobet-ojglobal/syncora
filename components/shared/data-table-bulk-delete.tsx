"use client"

import * as React from "react"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

interface DataTableBulkDeleteProps {
  selectedCount: number
  onConfirm: () => Promise<void>
}

export function DataTableBulkDelete({
  selectedCount,
  onConfirm,
}: DataTableBulkDeleteProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  if (selectedCount === 0) return null

  const handleExecuteDelete = async (e: React.MouseEvent) => {
    // Prevent the dialog wrapper from auto-closing instantly
    e.preventDefault()
    
    try {
      setIsDeleting(true)
      await onConfirm()
      setIsOpen(false) // Close dialog on success
    } catch (error) {
      console.error("Bulk processing action failed:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="h-9 px-3 flex items-center gap-2 animate-in fade-in-50 duration-200"
        >
          <Trash2 className="w-4 h-4" />
          Delete Selected ({selectedCount})
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. You are about to permanently remove{" "}
            <span className="font-semibold text-foreground">
              {selectedCount} selected {selectedCount === 1 ? "product" : "products"}
            </span>{" "}
            from your active system registry catalog.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExecuteDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-w-[100px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              "Confirm Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}