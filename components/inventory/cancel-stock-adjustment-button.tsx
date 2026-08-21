import React, { useState } from "react";
import { AlertTriangle, RotateCcw, Loader2, X } from "lucide-react";
import { Button } from "../ui/button";

interface CancelAdjustmentButtonProps {
  adjustmentId: string;
  adjustmentNumber: string;
  status: "DRAFT" | "POSTED" | "VOIDED";
  currentUserId: string;
  onSuccess?: () => void;
}

export const CancelAdjustmentButton: React.FC<CancelAdjustmentButtonProps> = ({
  adjustmentId,
  adjustmentNumber,
  status,
  currentUserId,
  onSuccess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Button disabled state
  if (status !== "POSTED") {
    return null;
  }

  const handleCancelAdjustment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/inventory/adjustments/${adjustmentId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            performedById: currentUserId,
            remarks,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel adjustment.");
      }

      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      {/* <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:text-red-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      > */}
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 gap-1.5 text-xs"
      >
        <RotateCcw className="w-4 h-4" />
        Cancel Adjustment
      </Button>

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Cancel Adjustment
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to cancel adjustment{" "}
                <span className="font-semibold text-gray-900">
                  #{adjustmentNumber}
                </span>
                ?
              </p>
              <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded p-2.5">
                <strong>Note:</strong> This action will create a reversing entry
                to restore stock levels, serial statuses, and bin locations.
              </p>

              {error && (
                <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g., Input error during stock take..."
                  className="w-full text-sm p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Keep Record
              </button>
              <button
                type="button"
                onClick={handleCancelAdjustment}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};