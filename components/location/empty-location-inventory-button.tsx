"use client";

import React, { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";

interface EmptyLocationButtonProps {
  locationId: string;
  locationName: string;
  onSuccess?: () => void;
}

export function EmptyLocationButton({
  locationId,
  locationName,
  onSuccess,
}: EmptyLocationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState("");

  const handleEmptyInventory = async () => {
    setIsLoading(true);
    setError(null);
    setProgressMessage("Starting cleanup...");

    try {
      const response = await fetch(
        `/api/admin/locations/${locationId}/inventory/empty`,
        { method: "POST" }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to initiate batch cleanup process.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep tail incomplete fragment

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.replace("data: ", ""));

          if (payload.type === "progress") {
            setProgressMessage(
              `Deleted batch of ${payload.batchCount} ${payload.phase} (Total: ${payload.totalDeleted})`
            );
            
            // Trigger frontend page revalidation on every batch completion
            // if (onSuccess) onSuccess();
          }

          if (payload.type === "complete") {
            if (onSuccess) onSuccess();
            setIsOpen(false);
          }

          if (payload.type === "error") {
            throw new Error(payload.error);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
      setProgressMessage("");
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 gap-1.5 text-xs"
      >
        <Trash2 className="w-4 h-4" />
        Empty Inventory
      </Button>

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Empty Inventory
                </h3>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Are you sure you want to delete all stock records, bins, and serial items for{" "}
                <span className="font-semibold text-gray-900">{locationName}</span>?
                This action is destructive and cannot be undone.
              </p>

              <p className="text-sm text-gray-600 leading-relaxed my-4">
                {progressMessage}
              </p>

              {error && (
                <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEmptyInventory}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    "Confirm Empty"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}