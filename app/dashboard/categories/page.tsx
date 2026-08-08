"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Search,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  ArrowRight,
  Layers,
  Box,
  ChevronsUp,
  ChevronsDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteButton } from "@/components/shared/delete-button";
import PageHeader from "@/components/layout/dashboard/PageHeader";

interface CategoryTreeItem {
  id: string;
  inflowId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  productsCount: number;
  subcategoriesCount: number;
  children: CategoryTreeItem[];
}

export default function CategoriesListPage() {
  const [rawCategories, setRawCategories] = useState<CategoryTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "root" | "sub">("all");
  const [productFilter, setProductFilter] = useState<"all" | "has-products" | "empty">("all");

  // Expansion & Pagination States
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        setRawCategories(data);
      }
    } catch (err) {
      console.error("Failed to load global taxonomy tree:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Tree Building Algorithm
  const treeData = useMemo(() => {
    const map: Record<string, CategoryTreeItem> = {};
    const tree: CategoryTreeItem[] = [];

    rawCategories.forEach((item) => {
      map[item.inflowId] = { ...item, children: [] };
    });

    rawCategories.forEach((item) => {
      if (item.parentId && map[item.parentId]) {
        map[item.parentId].children.push(map[item.inflowId]);
      } else {
        tree.push(map[item.inflowId]);
      }
    });

    return tree;
  }, [rawCategories]);

  // Filtering Tree Logic
  const filteredCategories = useMemo(() => {
    const filterNodes = (nodes: CategoryTreeItem[]): CategoryTreeItem[] => {
      return nodes
        .map((node) => {
          const query = searchQuery.toLowerCase().trim();
          const matchesQuery =
            node.name.toLowerCase().includes(query) ||
            (node.description?.toLowerCase().includes(query) ?? false);

          const matchesType =
            typeFilter === "all"
              ? true
              : typeFilter === "root"
              ? !node.parentId
              : Boolean(node.parentId);

          const matchesProduct =
            productFilter === "all"
              ? true
              : productFilter === "has-products"
              ? node.productsCount > 0
              : node.productsCount === 0;

          const selfMatches = matchesQuery && matchesType && matchesProduct;
          const filteredChildren = node.children ? filterNodes(node.children) : [];

          if (selfMatches || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
          }
          return null;
        })
        .filter((n): n is CategoryTreeItem => n !== null);
    };

    return filterNodes(treeData);
  }, [treeData, searchQuery, typeFilter, productFilter]);

  // Expand nodes automatically when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const autoExpanded: Record<string, boolean> = {};
      const collectExpanded = (nodes: CategoryTreeItem[]) => {
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            autoExpanded[node.inflowId] = true;
            collectExpanded(node.children);
          }
        });
      };
      collectExpanded(filteredCategories);
      setExpandedNodes(autoExpanded);
    }
  }, [searchQuery, filteredCategories]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, productFilter]);

  // Pagination on Top-Level Categories
  const totalPages = Math.ceil(filteredCategories.length / pageSize) || 1;
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  const handleToggleAllExpand = () => {
    if (isAllExpanded) {
      setExpandedNodes({});
      setIsAllExpanded(false);
    } else {
      const newExpandedState: Record<string, boolean> = {};
      const extractIdsWithChildren = (nodes: CategoryTreeItem[]) => {
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            newExpandedState[node.inflowId] = true;
            extractIdsWithChildren(node.children);
          }
        });
      };
      extractIdsWithChildren(filteredCategories);
      setExpandedNodes(newExpandedState);
      setIsAllExpanded(true);
    }
  };

  const toggleExpand = (inflowId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [inflowId]: !prev[inflowId] }));
  };

  // Render Row Recursive Component
  const RenderCategoryRow = ({ node, level = 0 }: { node: CategoryTreeItem; level: number }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = !!expandedNodes[node.inflowId];

    return (
      <>
        <div
          className="flex items-center justify-between py-3.5 px-4 border-b hover:bg-muted/30 transition-colors"
          style={{ paddingLeft: `${Math.max(level * 24, 16)}px` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Folder Toggle Button */}
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.inflowId)}
                className="text-muted-foreground p-0.5 hover:bg-muted rounded transition-colors shrink-0"
              >
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-500" />
                )}
              </button>
            ) : (
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full" />
              </div>
            )}

            {/* Thumbnail */}
            <div className="w-8 h-8 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {node.imageUrl ? (
                <Image
                  src={node.imageUrl}
                  alt={node.name}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/60" />
              )}
            </div>

            {/* Category Information */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold truncate text-foreground">
                  {node.name}
                </span>

                <Badge
                  variant="secondary"
                  className="text-[10px] tracking-tight py-0 h-4 px-1.5 bg-muted text-muted-foreground font-normal"
                >
                  {node.slug}
                </Badge>

                {node.subcategoriesCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-blue-600 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900 gap-1 font-medium py-0 h-4"
                  >
                    <Layers className="w-2.5 h-2.5" /> {node.subcategoriesCount}{" "}
                    {node.subcategoriesCount === 1 ? "sub" : "subs"}
                  </Badge>
                )}

                {node.productsCount > 0 ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900 gap-1 font-medium py-0 h-4"
                  >
                    <Box className="w-2.5 h-2.5" /> {node.productsCount}{" "}
                    {node.productsCount === 1 ? "product" : "products"}
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50 italic font-normal">
                    Empty
                  </span>
                )}
              </div>
              {node.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-md">
                  {node.description}
                </p>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-1 shrink-0 ml-4">
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-medium gap-1.5">
              <Link href={`/dashboard/categories/${node.id}/edit`}>
                Edit <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
            <DeleteButton
              itemId={node.id}
              itemName={node.name}
              endpointUrl={`/api/admin/categories/${node.id}`}
              onSuccess={fetchCategories}
              variant="icon"
            />
          </div>
        </div>

        {/* Render Nested Children */}
        {hasChildren && isExpanded && (
          <div className="bg-muted/10">
            {node.children.map((child) => (
              <RenderCategoryRow key={child.inflowId} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Header Banner */}
      <PageHeader
        className="border-b pb-5"
        title="Product Categories"
        description="Manage taxonomy groupings, track counts, and review catalog structures."
      >
        <Button asChild size="sm" className="gap-1.5 shrink-0">
          <Link href="/dashboard/categories/create">
            <Plus className="w-4 h-4" /> Add Category
          </Link>
        </Button>
      </PageHeader>

      {/* Control Toolbar (Search, Filter, & Expand All) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input 
            placeholder="Filter categories by name or info..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleToggleAllExpand}
          disabled={rawCategories.length === 0 || isLoading}
          className="h-9 text-xs font-medium gap-1.5 self-start sm:self-auto shrink-0"
        >
          {isAllExpanded ? (
            <>
              <ChevronsUp className="w-4 h-4 text-muted-foreground" />
              Collapse All Nodes
            </>
          ) : (
            <>
              <ChevronsDown className="w-4 h-4 text-muted-foreground" />
              Expand All Nodes
            </>
          )}
        </Button>
      </div>

      {/* Main Taxonomy Grid */}
      <div className="border rounded-xl overflow-hidden bg-card shadow-sm space-y-0">
        <div className="bg-muted/40 px-4 py-2.5 border-b text-[11px] font-semibold tracking-wider text-muted-foreground uppercase flex justify-between">
          <span>Taxonomy Classification Structure</span>
          <span className="mr-20">Actions</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span>Scanning active product catalog structure mappings...</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground border-dashed border-2 m-4 rounded-xl">
            No matching categories found for your search/filter parameters.
          </div>
        ) : (
          <div className="divide-y">
            {paginatedCategories.map((rootCategory) => (
              <RenderCategoryRow key={rootCategory.inflowId} node={rootCategory} level={0} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Bar Controls */}
      {!isLoading && filteredCategories.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-1">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Root categories per page</p>
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
      )}
    </div>
  );
}