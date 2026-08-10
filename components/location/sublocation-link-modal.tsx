"use client";

import { useState, useTransition } from "react";
import { Link2, Unlink, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { linkSublocationToLocation } from "@/actions/location-link";

export interface LocationOption {
  inflowId: string;
  name: string;
  alreadyLinkedSublocationId?: string | null;
  alreadyLinkedSublocationName?: string | null;
}

interface SublocationLinkModalProps {
  sublocation: {
    id: string;
    name: string;
    linkedLocationId?: string | null;
  };
  currentLocationId: string;
  locationsList: LocationOption[];
}

export function SublocationLinkModal({
  sublocation,
  currentLocationId,
  locationsList,
}: SublocationLinkModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    sublocation.linkedLocationId || ""
  );
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const res = await linkSublocationToLocation(
        sublocation.id,
        selectedLocationId === "" ? null : selectedLocationId,
        currentLocationId
      );

      if (res.success) {
        toast.success("Sublocation link updated successfully");
        setOpen(false);
      } else {
        toast.error("Failed to update sublocation link");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          {sublocation.linkedLocationId ? (
            <Badge variant="outline" className="text-[10px] gap-1 text-indigo-500 border-indigo-200 bg-indigo-50/50">
              <Link2 className="h-3 w-3" />
              Linked
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Unlink className="h-3 w-3 text-muted-foreground" />
              Unlinked
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Link &quot;{sublocation.name}&quot; to Location
          </DialogTitle>
          <DialogDescription className="text-xs">
            Connect this sublocation zone to an existing target location node.
            Locations already assigned to other sublocations are disabled.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[300px] overflow-y-auto space-y-3">
          <RadioGroup
            value={selectedLocationId}
            onValueChange={setSelectedLocationId}
            className="gap-2"
          >
            {/* Option to clear link */}
            <div className="flex items-center space-x-3 border border-border p-3 rounded-lg hover:bg-muted/10 cursor-pointer">
              <RadioGroupItem value="" id="none" />
              <Label htmlFor="none" className="text-xs font-semibold cursor-pointer flex-1">
                -- None (Unlink Location) --
              </Label>
            </div>

            {locationsList.map((loc) => {
              const isLinkedToAnother =
                loc.alreadyLinkedSublocationId &&
                loc.alreadyLinkedSublocationId !== sublocation.id;

              return (
                <div
                  key={loc.inflowId}
                  className={`flex items-center justify-between border border-border p-3 rounded-lg ${
                    isLinkedToAnother
                      ? "opacity-50 bg-muted/20 cursor-not-allowed"
                      : "hover:bg-muted/10 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <RadioGroupItem
                      value={loc.inflowId}
                      id={loc.inflowId}
                      disabled={Boolean(isLinkedToAnother)}
                    />
                    <Label
                      htmlFor={loc.inflowId}
                      className={`text-xs font-medium truncate ${
                        isLinkedToAnother ? "cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      {loc.name}
                    </Label>
                  </div>

                  {isLinkedToAnother && (
                    <Badge variant="outline" className="text-[9px] text-amber-600 bg-amber-50">
                      Linked to {loc.alreadyLinkedSublocationName || "Other Bin"}
                    </Badge>
                  )}
                </div>
              );
            })}
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="text-xs"
          >
            {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Save Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}