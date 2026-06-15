// app/admin/attributes/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Settings2, Sliders, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/shared/delete-button";

interface AttributeValue {
  id: string;
  value: string;
  hexCode: string | null;
}

interface AttributeItem {
  id: string;
  name: string;
  values: AttributeValue[];
}

export default function AttributesListPage() {
  const [attributes, setAttributes] = useState<AttributeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchAttributes = async () => {
    try {
      const res = await fetch("/api/admin/attributes");
      if (res.ok) {
        const data = await res.json();
        setAttributes(data);
      }
    } catch (err) {
      console.error("Error updating system variant cache:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  // Live filter evaluation matching against the attribute name or individual options values strings
  const filteredAttributes = attributes.filter((attr) => {
    const query = searchQuery.toLowerCase();
    const nameMatches = attr.name.toLowerCase().includes(query);
    const valueMatches = attr.values.some((v) => v.value.toLowerCase().includes(query));
    return nameMatches || valueMatches;
  });

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Top Main Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Variant Attributes</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure dynamic catalog option configurations used to formulate e-commerce product combinations.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 shrink-0">
          <Link href="/dashboard/attributes/create">
            <Plus className="w-4 h-4" /> Define Attribute
          </Link>
        </Button>
      </div>

      {/* Filter Utility Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search attribute types or variant values..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="text-xs text-muted-foreground font-medium bg-muted/50 border px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5" />
          Option Types: <span className="font-bold text-foreground">{attributes.length}</span>
        </div>
      </div>

      {/* Main Attributes Listing Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground italic bg-card border rounded-xl">
          Compiling catalog variant structures...
        </div>
      ) : filteredAttributes.length === 0 ? (
        <div className="p-16 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No configurable attributes or matching values found matching your input constraints.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-sm divide-y">
          {filteredAttributes.map((attr) => (
            <div
              key={attr.id}
              className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-muted/10 transition-colors"
            >
              {/* Left Side: Parent Identity Layout Metadata Block */}
              <div className="space-y-1.5 min-w-[180px]">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground tracking-tight">{attr.name}</h3>
                  <Badge variant="secondary" className="text-[10px] font-mono font-normal h-4 py-0 px-1 text-muted-foreground bg-muted">
                    {attr.values.length} {attr.values.length === 1 ? "value" : "values"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                  <Hash className="w-3 h-3 shrink-0" />
                  ID Reference: <span className="font-mono text-[10px] text-foreground select-all">{attr.id.slice(0, 8)}...</span>
                </p>
              </div>

              {/* Center Box Component: Visual Values Chips Matrix Stack */}
              <div className="flex-1 flex flex-wrap gap-1.5 items-center bg-muted/20 border p-3 rounded-xl max-w-2xl">
                {attr.values.map((v) => (
                  <div
                    key={v.id}
                    className="inline-flex items-center gap-1.5 bg-background border rounded-lg pl-2 pr-2.5 py-1 text-xs font-medium shadow-xs group/chip hover:border-muted-foreground/30 transition-colors"
                  >
                    {/* Render visual color bubble circle conditional upon Hex code availability */}
                    {v.hexCode && (
                      <span
                        className="w-3 h-3 rounded-full border border-black/10 shadow-xs shrink-0 block"
                        style={{ backgroundColor: v.hexCode }}
                        title={`Hex representation: ${v.hexCode}`}
                      />
                    )}
                    <span className="text-foreground">{v.value}</span>
                    {v.hexCode && (
                      <span className="text-[9px] font-mono text-muted-foreground/60 hidden group-hover/chip:inline ml-0.5">
                        {v.hexCode}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Right Side Actions Options Panel */}
              <div className="flex items-center gap-1 self-end md:self-start shrink-0 ml-4">
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-semibold gap-1">
                  <Link href={`/dashboard/attributes/${attr.id}/edit`}>
                    <Settings2 className="w-3.5 h-3.5" /> Modify
                  </Link>
                </Button>
                <DeleteButton
                  itemId={attr.id}
                  itemName={attr.name}
                  endpointUrl="/api/admin/attributes"
                  onSuccess={fetchAttributes}
                  variant="icon"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}