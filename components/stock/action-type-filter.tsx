"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ActionTypeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentFilter = searchParams.get("actionType") || "ALL";

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "ALL") {
      params.delete("actionType");
    } else {
      params.set("actionType", value);
    }

    // Reset page to 1 whenever filter changes
    params.set("actionPage", "1");
    params.set("tab", "serial-actions");

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Filter Action:</span>
      <Select value={currentFilter} onValueChange={handleFilterChange}>
        <SelectTrigger className="w-[150px] h-8 text-xs">
          <SelectValue placeholder="All Actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Actions</SelectItem>
          <SelectItem value="ADD">ADD</SelectItem>
          <SelectItem value="REMOVE">REMOVE</SelectItem>
          <SelectItem value="MOVE">MOVE</SelectItem>
          <SelectItem value="VERIFY">VERIFY</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}