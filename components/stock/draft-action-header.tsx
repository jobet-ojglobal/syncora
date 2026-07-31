import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertOctagon, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner"; // Or your preferred toast library

interface DraftActionsProps {
  adjustmentId: string;
  isSubmitting?: boolean;
}

export function DraftActionHeader({ adjustmentId, isSubmitting }: DraftActionsProps) {
  const router = useRouter();
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // PATCH handler to update status to CANCELLED
  const handleVoidDraft = async () => {
    try {
      setIsVoiding(true);

      const response = await fetch("/api/admin/inventory/adjustment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustmentId,
          status: "CANCELLED",
          reason: voidReason || "Draft cancelled by operator.",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to void draft adjustment.");
      }

      toast.success("Draft Adjustment Voided", {
        description: "The draft status has been set to CANCELLED.",
      });

      setShowVoidModal(false);
      router.push("/dashboard/adjustments");
      router.refresh();
    } catch (err: any) {
      toast.error("Void Operation Failed", { description: err.message });
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Void/Cancel Button */}
        <button
          type="button"
          disabled={isSubmitting || isVoiding}
          onClick={() => setShowVoidModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 rounded-lg transition-colors disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          Void / Cancel Draft
        </button>
      </div>

      {/* Confirmation Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-background border rounded-xl shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-foreground">
                  Void Draft Adjustment?
                </h3>
                <p className="text-xs text-muted-foreground">
                  This action marks draft <span className="font-mono">{adjustmentId}</span> as cancelled.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Cancellation Reason (Optional)
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Specify why this draft is being voided..."
                className="w-full h-20 text-xs p-2.5 rounded-md border bg-muted/20 border-border focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                disabled={isVoiding}
                onClick={() => setShowVoidModal(false)}
                className="px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-muted transition-colors"
              >
                Keep Draft
              </button>
              <button
                type="button"
                disabled={isVoiding}
                onClick={handleVoidDraft}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-destructive hover:bg-destructive/90 rounded-md transition-colors disabled:opacity-50"
              >
                {isVoiding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Cancel/Void
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}