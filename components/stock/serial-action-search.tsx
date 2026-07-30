"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export function SerialActionSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("serialQuery") || "";
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  // Sync state if URL changes externally
  useEffect(() => {
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  // Debounce URL updates
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm === initialSearch) return;

      const params = new URLSearchParams(searchParams.toString());

      if (searchTerm.trim()) {
        params.set("serialQuery", searchTerm.trim());
      } else {
        params.delete("serialQuery");
      }

      params.set("actionPage", "1");
      params.set("tab", "serial-actions");

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, initialSearch, pathname, router, searchParams]);

  return (
    <div className="relative w-full sm:w-[220px]">
      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search serial no..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-8 pl-8 pr-8 text-xs"
      />
      {searchTerm && (
        <button
          type="button"
          onClick={() => setSearchTerm("")}
          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}