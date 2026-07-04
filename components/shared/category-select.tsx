// @/components/shared/category-select.tsx
"use client";

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

interface Category {
  inflowId: string;
  name: string;
}

interface CategorySelectProps {
  value?: string | null;
  onChange: (value: string) => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed loading categories:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setCreating(true);
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newCategoryName,
          parentId: "root-level" // Matches route expectation fallback
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create category.");
      }

      toast.success("Category created successfully");
      
      setCategories((prev) => [...prev, data]);
      onChange(data.inflowId); // Using schema property key target
      
      setNewCategoryName("");
      setDialogOpen(false);
      setOpen(false);
    } catch (err: any) {
      toast.error("Creation Failed", { description: err.message });
    } finally {
      setCreating(false);
    }
  };

  const selectedCategory = categories.find((c) => c.inflowId === value);

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
                <Loader2 className="h-3 w-3 animate-spin" /> Loading categories...
              </span>
            ) : selectedCategory ? (
              selectedCategory.name
            ) : (
              <span className="text-muted-foreground">Choose department placement...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 max-h-60" align="start">
          <Command>
            <CommandInput placeholder="Search departments..." className="h-9" />
            <CommandList>
              <CommandEmpty className="p-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start gap-2 px-2 py-1.5 text-xs text-primary font-medium"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create category &quot;{newCategoryName}&quot;</span>
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
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Unassigned
                </CommandItem>
                {categories.map((category) => (
                  <CommandItem
                    key={category.inflowId}
                    value={category.name}
                    onSelect={() => {
                      onChange(category.inflowId);
                      setOpen(false);
                    }}
                    className="text-sm"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === category.inflowId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {category.name}
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
                <span>Add New Category</span>
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Embedded Creator Drawer Framework */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>
                Establish a core departmental index structure to organize your item records.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category Name
              </label>
              <Input
                placeholder="e.g. Electronics, Home Goods, Apparel"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newCategoryName.trim()}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}