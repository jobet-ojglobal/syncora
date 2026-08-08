"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Tag, 
  Trash2, 
  Edit3, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Filter
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<"all" | "used" | "unused">("all");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer Controls
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/tags/list");
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

  // Filtered logic
  const filteredTags = useMemo(() => {
    return tags.filter((tag) => {
      // Name Search Filter
      const matchesSearch = tag.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase().trim());

      // Usage Status Filter
      const matchesUsage =
        usageFilter === "all"
          ? true
          : usageFilter === "used"
          ? tag._count.products > 0
          : tag._count.products === 0;

      return matchesSearch && matchesUsage;
    });
  }, [tags, searchQuery, usageFilter]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, usageFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTags.length / pageSize) || 1;
  const paginatedTags = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTags.slice(start, start + pageSize);
  }, [filteredTags, currentPage, pageSize]);

  const handleDelete = async (id: string, name: string, activeCount: number) => {
    const confirmationPrompt =
      activeCount > 0
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Product Tags</h1>
          <p className="text-sm text-muted-foreground">
            Manage global descriptive labels used for inventory sorting, filtering, and customer storefront navigation.
          </p>
        </div>
        <Button onClick={openCreateModal} size="sm" className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add New Tag
        </Button>
      </div>

      {/* Toolbar Controls (Filters & Search) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border shadow-sm">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tags by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Usage Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground hidden md:inline-block" />
            <Select
              value={usageFilter}
              onValueChange={(val: "all" | "used" | "unused") => setUsageFilter(val)}
            >
              <SelectTrigger className="h-9 text-xs w-[140px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                <SelectItem value="used">In Use</SelectItem>
                <SelectItem value="unused">Unused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Total Badge Indicator */}
        <div className="text-xs text-muted-foreground self-end sm:self-center">
          Showing <span className="font-medium text-foreground">{filteredTags.length}</span> results
        </div>
      </div>

      {/* Data Layout Wrapper */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border rounded-lg bg-card/50">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading tags directory...</p>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border rounded-lg bg-card/50 text-center">
          <Tag className="h-8 w-8 text-muted-foreground/60" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No tags found</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {searchQuery || usageFilter !== "all"
                ? "No tags match your current filter settings. Try adjusting your search query."
                : "Get started by creating your first product categorization label above."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Tag Name</TableHead>
                  <TableHead>Associated Products</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTags.map((tag) => (
                  <TableRow key={tag.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{tag.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tag._count.products > 0 ? "secondary" : "outline"} className="text-[11px]">
                        {tag._count.products} {tag._count.products === 1 ? "product" : "products"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {new Date(tag.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditModal(tag)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(tag.id, tag.name, tag._count.products)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-1">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Rows per page</p>
              <Select
                value={`${pageSize}`}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-6">
              <span className="text-xs text-muted-foreground">
                Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Create Form Drawer Sheet */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingTag ? "Edit Product Tag" : "Create Product Tag"}</SheetTitle>
            <SheetDescription>
              {editingTag
                ? "Modify the chosen label parameters across your live inventory catalog systems."
                : "Add a fresh filter identifier to categorize items in your index configuration profiles."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <TagForm
              initialData={editingTag}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}