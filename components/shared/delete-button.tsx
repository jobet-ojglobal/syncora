// components/ui/DeleteButton.tsx
"use client";

import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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
} from "@/components/ui/alert-dialog"; // Replace with your design system's primitive dialog paths
import { Button } from "@/components/ui/button";

interface DeleteButtonProps {
  itemId: string;
  itemName: string;
  endpointUrl: string; // The backend API target route (e.g., "/api/admin/categories")
  onSuccess?: (id: string) => void; // Callback to refresh lists or redirect pages after success
  variant?: "icon" | "full"; // Customize style display options
}

export function DeleteButton({
  itemId,
  itemName,
  endpointUrl,
  onSuccess,
  variant = "icon",
}: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDeleting(true);

    try {
      const response = await fetch(endpointUrl, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }), // Targets your tracking ID token
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove item.");
      }

      const data = await response.json()

      toast.success("Record Deleted", {
        description: data?.message || `Successfully wiped "${itemName}" from database systems.`,
      });

      setIsOpen(false);
      if (onSuccess) onSuccess(itemId);
    } catch (err: any) {
      console.error("Deletion error occurred:", err);
      toast.error("Deletion Failed", {
        description: err.message || "Could not complete the request.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      {/* 1. Trigger Entry Point */}
      <AlertDialogTrigger asChild>
        {variant === "icon" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            title={`Delete ${itemName}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button 
            type="button" 
            variant="destructive" 
            className="w-full gap-2 text-xs font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete {itemName}
          </Button>
        )}
      </AlertDialogTrigger>

      {/* 2. Modal Popup Dialog Portal Elements */}
      <AlertDialogContent className="max-w-md rounded-xl">
        <AlertDialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0 sm:h-10 sm:w-10 mb-2">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <AlertDialogTitle className="text-left">
            Are you absolutely sure?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left text-sm text-muted-foreground mt-1">
            This will permanently remove <span className="font-semibold text-foreground">"{itemName}"</span> from your catalog indexing. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
          <AlertDialogCancel asChild>
            <Button variant="outline" size="sm" disabled={isDeleting} className="h-9">
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-9 min-w-[90px]"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Wiping...
                </>
              ) : (
                "Confirm Delete"
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}