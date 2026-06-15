// app/admin/brands/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Globe, FolderHeart, ShieldAlert, Layers, Box, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchBrands = async () => {
    try {
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

  // Filter criteria logic
  const filteredBrands = brands.filter((brand) => {
    const normalizedQuery = searchQuery.toLowerCase();
    return (
      brand.name.toLowerCase().includes(normalizedQuery) ||
      (brand.description?.toLowerCase().includes(normalizedQuery) ?? false)
    );
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Upper Heading Action Block */}
      <PageHeader 
        className=" border-b pb-5" 
        title="Catalog Brands" 
        description="Manage product manufacturers, website directories, and monitor related collection inventory metrics." 
        >
        <Button asChild size="sm" className="gap-1.5 shrink-0">
          <Link href="/dashboard/brands/create">
            <Plus className="w-4 h-4" /> New Brand
          </Link>
        </Button>
      </PageHeader>

      {/* Control Utility Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search manufacturer name or profile details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="text-xs text-muted-foreground font-medium bg-muted/50 border px-3 py-1.5 rounded-lg self-start sm:self-auto">
          Total Tracked Profiles: <span className="font-bold text-foreground">{brands.length}</span>
        </div>
      </div>

      {/* Grid Core Output Content */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground italic bg-card border rounded-xl shadow-sm">
          Compiling manufacturer inventory metric allocations...
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="p-16 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No brand catalog identities discovered matching your search input parameters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBrands.map((brand) => (
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
                        <img src={brand.logoUrl} alt={`${brand.name} logo`} className="w-full h-full object-contain p-1" />
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
      )}
    </div>
  );
}