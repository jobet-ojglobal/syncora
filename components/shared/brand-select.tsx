"use client";
// @/components/shared/brand-select.tsx

import * as React from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
}

interface BrandSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
}

export function BrandSelect({ value, onChange }: BrandSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [newBrandName, setNewBrandName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // Fetch brands directory
  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/brands/basic"); 
      if (res.ok) {
        const data = await res.json();
        setBrands(data);
      }
    } catch (err) {
      console.error("Failed loading brands:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchBrands();
  }, []);

  // Handle creating a brand inline
  const handleCreateBrand = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // 🎯 CRITICAL FIX: Stops the event from bubbling up to the product form hierarchy
    }
    
    if (!newBrandName.trim()) return;

    try {
      setCreating(true);
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBrandName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create brand.");
      }

      toast.success("Brand created successfully");
      
      setBrands((prev) => [...prev, data]);
      onChange(data.id);
      
      setNewBrandName("");
      setDialogOpen(false);
      setOpen(false);
    } catch (err: any) {
      toast.error("Creation Failed", { description: err.message });
    } finally {
      setCreating(false);
    }
  };

  // 🎯 CRITICAL FIX: Submits on Enter key inside the input without native form trigger contexts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleCreateBrand();
    }
  };

  const selectedBrand = brands.find((brand) => brand.id === value);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal text-sm h-10 shadow-xs"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading brands...
              </span>
            ) : selectedBrand ? (
              selectedBrand.name
            ) : (
              <span className="text-muted-foreground">Select a brand...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 max-h-60" align="start">
          <Command>
            <CommandInput placeholder="Search brands..." className="h-9" />
            <CommandList>
              <CommandEmpty className="p-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start gap-2 px-2 py-1.5 text-xs text-primary font-medium"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create brand &quot;{newBrandName}&quot;</span>
                </Button>
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value=""
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="text-xs text-muted-foreground font-medium"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      value === "" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  No explicit brand map
                </CommandItem>
                {brands.map((brand) => (
                  <CommandItem
                    key={brand.id}
                    value={brand.name}
                    onSelect={() => {
                      onChange(brand.id);
                      setOpen(false);
                    }}
                    className="text-sm"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === brand.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {brand.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            
            <div className="border-t p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add New Brand</span>
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Embedded Provisioning Dialog Frame Matrix */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {/* 🎯 CRITICAL FIX: Swapped out the nested `<form>` tag entirely for a standalone div workspace */}
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add New Brand</DialogTitle>
              <DialogDescription>
                Create a missing catalog profile without disrupting your layout workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Brand Name
              </label>
              <Input
                placeholder="e.g. Nike, Apple, Sony"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                onKeyDown={handleKeyDown} // 🎯 Intercepts the submit key event cleanly
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              {/* 🎯 CRITICAL FIX: Explicit type="button" layout alignment instead of type="submit" */}
              <Button 
                type="button" 
                disabled={creating || !newBrandName.trim()} 
                onClick={handleCreateBrand}
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Brand
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}