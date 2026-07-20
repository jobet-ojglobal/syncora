"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Search, Edit2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export interface AdjustmentReasonItem {
  id: string;
  inflowId: string;
  name: string;
  isActive: boolean;
  isInternal: boolean;
  createdAt: string | Date;
  _count?: {
    localMappings: number;
  };
}

interface AdjustmentReasonsTableProps {
  initialData: AdjustmentReasonItem[];
}

export function AdjustmentReasonsTable({ initialData }: AdjustmentReasonsTableProps) {
  const router = useRouter();
  const [data, setData] = useState<AdjustmentReasonItem[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = data.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.inflowId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/adjustment-reasons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isActive: !currentStatus } : item
        )
      );

      toast.success(`Status changed to ${!currentStatus ? "Active" : "Inactive"}`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Could not update status");
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reason or inflowId..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button asChild>
          <Link href="/dashboard/settings/adjustment-reasons/create">
            <Plus className="mr-2 h-4 w-4" /> New Reason
          </Link>
        </Button>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reason Name</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mappings</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No adjustment reasons found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    {row.isInternal ? (
                      <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
                        <ShieldAlert className="h-3 w-3" /> Internal
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Global</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={row.isActive ? "default" : "destructive"}
                      className="cursor-pointer"
                      onClick={() => toggleStatus(row.id, row.isActive)}
                    >
                      {row.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {row._count?.localMappings ?? 0} locations
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link href={`/dashboard/adjustment-reasons/${row.id}/edit`}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => toggleStatus(row.id, row.isActive)}
                          className="cursor-pointer"
                        >
                          Mark as {row.isActive ? "Inactive" : "Active"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}