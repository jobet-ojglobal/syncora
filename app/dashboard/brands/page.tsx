"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Plus, 
  Search, 
  Globe, 
  FolderHeart, 
  Layers, 
  Box, 
  ArrowUpRight,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteButton } from "@/components/shared/delete-button";
import PageHeader from "@/components/layout/dashboard/PageHeader";

interface BrandListItem {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  productsCount: number;
  groupsCount: number;
}

export default function BrandsListPage() {
  const [brands, setBrands] = useState<BrandListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [websiteFilter, setWebsiteFilter] = useState<"all" | "has-link" | "no-link">("all");
  const [skuFilter, setSkuFilter] = useState<"all" | "has-skus" | "no-skus">("all");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9); // Default to 9 for a balanced 3x3 grid layout

  const fetchBrands = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/brands");
      if (res.ok) {
        const data = await res.json();
        setBrands(data);
      }
    } catch (err) {
      console.error("Error updating system brands cache:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  // Filtered logic
  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      // Search Name & Description
      const normalizedQuery = searchQuery.toLowerCase().trim();
      const matchesQuery =
        brand.name.toLowerCase().includes(normalizedQuery) ||
        (brand.description?.toLowerCase().includes(normalizedQuery) ?? false);

      // Website Filter
      const matchesWebsite =
        websiteFilter === "all"
          ? true
          : websiteFilter === "has-link"
          ? Boolean(brand.websiteUrl)
          : !brand.websiteUrl;

      // SKU/Inventory Filter
      const matchesSku =
        skuFilter === "all"
          ? true
          : skuFilter === "has-skus"
          ? brand.productsCount > 0
          : brand.productsCount === 0;

      return matchesQuery && matchesWebsite && matchesSku;
    });
  }, [brands, searchQuery, websiteFilter, skuFilter]);

  // Reset pagination to page 1 whenever search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, websiteFilter, skuFilter]);

  // Pagination Calculation
  const totalPages = Math.ceil(filteredBrands.length / pageSize) || 1;
  const paginatedBrands = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBrands.slice(start, start + pageSize);
  }, [filteredBrands, currentPage, pageSize]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Upper Heading Action Block */}
      <PageHeader 
        className="border-b pb-5" 
        title="Catalog Brands" 
        description="Manage product manufacturers, website directories, and monitor related collection inventory metrics." 
      >
        <Button asChild size="sm" className="gap-1.5 shrink-0">
          <Link href="/dashboard/brands/create">
            <Plus className="w-4 h-4" /> New Brand
          </Link>
        </Button>
      </PageHeader>

      {/* Control Utility Toolbar (Search & Multi-Filter) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-3 rounded-lg border shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Search manufacturer name or profile details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Filters Container */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline-block" />
            
            {/* Website Filter */}
            <Select
              value={websiteFilter}
              onValueChange={(val: "all" | "has-link" | "no-link") => setWebsiteFilter(val)}
            >
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <SelectValue placeholder="Website Link" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Web Links</SelectItem>
                <SelectItem value="has-link">With Website</SelectItem>
                <SelectItem value="no-link">No Website</SelectItem>
              </SelectContent>
            </Select>

            {/* Inventory SKU Filter */}
            <Select
              value={skuFilter}
              onValueChange={(val: "all" | "has-skus" | "no-skus") => setSkuFilter(val)}
            >
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <SelectValue placeholder="SKU Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SKUs</SelectItem>
                <SelectItem value="has-skus">Has Products</SelectItem>
                <SelectItem value="no-skus">No Products</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Total Metric Counter */}
        <div className="text-xs text-muted-foreground font-medium self-end md:self-center">
          Showing <span className="font-bold text-foreground">{filteredBrands.length}</span> of {brands.length} Profiles
        </div>
      </div>

      {/* Grid Core Output Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-sm gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span>Compiling manufacturer inventory metric allocations...</span>
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="p-16 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No brand catalog identities discovered matching your search input and active filter parameters.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedBrands.map((brand) => (
              <div
                key={brand.id}
                className="group bg-card border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-muted-foreground/20 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Upper Branding Bar Segment */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {brand.logoUrl ? (
                          <Image src={brand.logoUrl} alt={`${brand.name} logo`} height={40} width={40} className="w-full h-full object-contain p-1" />
                        ) : (
                          <FolderHeart className="w-5 h-5 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold tracking-tight text-foreground truncate">{brand.name}</h3>
                        {brand.websiteUrl ? (
                          <a
                            href={brand.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5 truncate max-w-[160px]"
                          >
                            <Globe className="w-2.5 h-2.5 shrink-0" />
                            Website <ArrowUpRight className="w-2 h-2 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50 italic block mt-0.5">No link provided</span>
                        )}
                      </div>
                    </div>

                    {/* Top Right Action Row Dropdowns */}
                    <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-semibold px-2">
                        <Link href={`/dashboard/brands/${brand.id}/edit`}>Edit</Link>
                      </Button>
                      <DeleteButton
                        itemId={brand.id}
                        itemName={brand.name}
                        endpointUrl={`/api/admin/brands/${brand.id}/soft-delete`}
                        onSuccess={fetchBrands}
                        variant="icon"
                      />
                    </div>
                  </div>

                  {/* Description Segment */}
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2 min-h-[32px] leading-relaxed">
                    {brand.description || "No corporate catalog profile context or background information supplied yet."}
                  </p>
                </div>

                {/* Data Metric Footnote Dividers Row */}
                <div className="flex items-center gap-3 pt-4 mt-4 border-t border-muted/60 text-[11px]">
                  {/* Variation Groups Tracker */}
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Layers className="w-3.5 h-3.5 text-blue-500/80" />
                    <span>
                      <strong className="text-foreground">{brand.groupsCount}</strong> {brand.groupsCount === 1 ? "Group" : "Groups"}
                    </span>
                  </div>

                  {/* Individual SKUs / Items Tracker */}
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Box className="w-3.5 h-3.5 text-emerald-500/80" />
                    <span>
                      <strong className="text-foreground">{brand.productsCount}</strong> {brand.productsCount === 1 ? "SKU" : "SKUs"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Grid Pagination Bar Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-1">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Cards per page</p>
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
                  {[6, 9, 12, 24, 48].map((size) => (
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
    </div>
  );
}