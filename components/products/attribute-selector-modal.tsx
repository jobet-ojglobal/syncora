import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "../ui/button";

interface AttributeSelectorModalProps {
  isOpen: boolean;
  attributeId: string;
  availableValues: Array<{ id: string; value: string }>;
  currentSelections: Array<{ value: string }>;
  onClose: () => void;
  onConfirm: (values: Array<{ value: string }>) => void;
}

export function AttributeSelectorModal({
  isOpen,
  availableValues,
  currentSelections,
  onClose,
  onConfirm
}: AttributeSelectorModalProps) {
  // Map string array representation for tracking toggles
  const [selectedTerms, setSelectedTerms] = useState<string[]>(
    currentSelections.map((s) => s.value)
  );

  const toggleTerm = (term: string) => {
    setSelectedTerms((prev) =>
      prev.includes(term) ? prev.filter((t) => t !== term) : [...prev, term]
    );
  };

  const handleSave = () => {
    // Transform flat layout back to react-hook-form format: [{ value: "..." }]
    const formattedPayload = selectedTerms.map((term) => ({ value: term }));
    onConfirm(formattedPayload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Attribute Values</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 max-h-[300px] overflow-y-auto space-y-2">
          {availableValues.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              No values found registered under this class profile.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {availableValues.map((av) => {
                const isChecked = selectedTerms.includes(av.value);
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => toggleTerm(av.value)}
                    className={`flex items-center justify-between p-2.5 text-xs font-medium border rounded-lg text-left transition-all ${
                      isChecked
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-muted bg-background hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <span>{av.value}</span>
                    {isChecked && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Apply Matrix Setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}