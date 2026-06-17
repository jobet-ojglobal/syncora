// app/admin/tags/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Tag, Trash2, Edit3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { TagForm } from "@/components/tag/tag-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DeleteButton } from "@/components/shared/delete-button";

interface TagWithCount {
  id: string;
  name: string;
  createdAt: string;
  _count: {
    products: number;
  };
}

export default function TagsAdminPage() {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Drawer state controls
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/tags");
      if (!res.ok) throw new Error("Could not load the product tags index.");
      const data = await res.json();
      setTags(data);
    } catch (err: any) {
      toast.error("Fetch Error", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleDelete = async (id: string, name: string, activeCount: number) => {
    const confirmationPrompt = activeCount > 0 
      ? `Warning: This tag is currently linked to ${activeCount} products. Delete it anyway?`
      : `Are you sure you want to delete the tag "${name}"?`;

    if (!confirm(confirmationPrompt)) return;

    try {
      const res = await fetch("/api/admin/tags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete the requested tag.");
      }

      toast.success("Tag removed successfully");
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      toast.error("Action Failed", { description: err.message });
    }
  };

  const openCreateModal = () => {
    setEditingTag(null);
    setIsFormOpen(true);
  };

  const openEditModal = (tag: { id: string; name: string }) => {
    setEditingTag(tag);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingTag(null);
    fetchTags();
  };

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      
      {/* Header Row */}
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Tag className="h-6 w-6 text-primary" /> 
            <span>Product Tags</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage global descriptive labels used for inventory sorting, filtering, and customer storefront navigation.
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 self-start font-medium shadow-xs">
          <Plus className="h-4 w-4" /> 
          <span>Add New Tag</span>
        </Button>
      </div>

      {/* Toolbar Controls */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Search tags by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs"
        />
      </div>

      {/* Data Layout Wrapper */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 text-muted-foreground gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading tags directory...</span>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/10 p-16 text-center">
          <Tag className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-base font-semibold text-foreground">No tags found</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {searchQuery 
              ? "No tags match your current search parameters. Try adjusting your keywords." 
              : "Get started by creating your first product categorization label above."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground font-medium">
                <th className="p-4 pl-5 font-semibold">Tag Name</th>
                <th className="p-4 font-semibold text-center">Linked Products</th>
                <th className="p-4 font-semibold hidden md:table-cell">Date Created</th>
                <th className="p-4 pr-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTags.map((tag) => (
                <tr key={tag.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-4 pl-5 font-medium text-foreground">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-primary/30 ring-1 ring-primary/60" />
                      {tag.name}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-medium border ${
                      tag._count.products > 0 
                        ? "bg-secondary text-secondary-foreground border-border" 
                        : "bg-muted text-muted-foreground/60 border-transparent"
                    }`}>
                      {tag._count.products} {tag._count.products === 1 ? "product" : "products"}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">
                    {new Date(tag.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </td>
                  <td className="p-4 pr-5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditModal({ id: tag.id, name: tag.name })}
                        title="Edit tag"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <DeleteButton
                        itemId={tag.id}
                        itemName={tag.name}
                        endpointUrl={`/api/admin/tags/${tag.id}`}
                        onSuccess={handleFormSuccess}
                        variant="icon"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-out Panel Form */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="sm:max-w-md flex flex-col justify-between">
          <div className="space-y-6">
            <SheetHeader>
              <SheetTitle>
                {editingTag ? "Edit Product Tag" : "Create Product Tag"}
              </SheetTitle>
              <SheetDescription>
                {editingTag 
                  ? "Modify the chosen label parameters across your live inventory catalog systems." 
                  : "Add a fresh filter identifier to categorize items in your index configuration profiles."}
              </SheetDescription>
            </SheetHeader>
            
            <div className="px-4">
                <TagForm 
                    initialData={editingTag} 
                    onSuccess={handleFormSuccess} 
                    onCancel={() => setIsFormOpen(false)}
                  />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  ); 
}