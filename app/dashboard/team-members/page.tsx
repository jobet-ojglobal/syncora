"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Users, Shield, Warehouse, Edit3, CheckCircle2, XCircle, Award, MoreHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeleteButton } from "@/components/shared/delete-button";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import useSWR from "swr";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import SearchInput from "@/components/shared/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface LocationNode {
  code: string;
  name: string;
}

interface MemberRow {
  id: string;
  inflowId: string;
  name: string;
  email: string;
  isActive: boolean;
  canBeSalesRep: boolean;
  accessAllLocations: boolean;
  totalAssignedTasks: number;
  rightsList: string[];
  assignedLocations: LocationNode[];
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to resolve team member directory.");
  return res.json();
});

export default function TeamMembersListPage() {
  // 1. Double-state setup for instantaneous typing vs debounced network execution
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. SWR list key hook binds directly onto debounced search value variable
  const {
    data: payload,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(
    `/api/admin/team-members/filtered?search=${encodeURIComponent(
      debouncedSearch
    )}&page=${pageIndex}&limit=${PAGE_SIZE}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  const roster: MemberRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  // Handle Search input adjustments
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Hydration Failure: Failed resolving enterprise personnel authorization directory profiles.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader
        title="Active Team Directory"
        description="Manage enterprise clearance rules settings, physical warehouse access configurations, and system authorization tokens tracking handles."
        icon={Users}
        className="border-b border-border pb-4"
      >
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/team-members/create">
            <Plus className="w-4 h-4" /> Provision New Member
          </Link>
        </Button>
      </PageHeader>

      {/* Lookup search component utility filter toolbar segment */}
      <div className="w-full sm:max-w-md">
        <SearchInput
          placeholder="Filter team members by name, email..."
          searchQuery={searchQuery}
          setSearchQuery={handleSearchChange}
          isLoading={isValidating && !isLoading}
        />
      </div>

      {/* Central data layout directory board canvas */}
      {isLoading && !payload ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
          Parsing systemic active credential indices and access profiles maps array tree structures...
        </div>
      ) : roster.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No personnel files mapped matching specified search filters conditions.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-2xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="pl-5 w-[180px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Name
                  </TableHead>
                  <TableHead className="w-[240px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Email
                  </TableHead>
                  <TableHead className="w-[110px] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sales Rep
                  </TableHead>
                  <TableHead className="w-[220px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Location Access
                  </TableHead>
                  <TableHead className="w-[110px] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Permissions
                  </TableHead>
                  <TableHead className="w-[90px] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="pr-5 w-[100px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-medium">
                {roster.map((member) => (
                  <TableRow key={member.id} className="hover:bg-muted/5 transition-colors">
                    
                    {/* Name */}
                    <TableCell className="pl-5 font-medium">
                      <div className="font-semibold text-foreground text-[13px]">{member.name}</div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-muted-foreground font-mono select-all">
                      {member.email}
                    </TableCell>

                    {/* Sales Rep */}
                    <TableCell className="text-center">
                      {member.canBeSalesRep ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-600 border-emerald-500/20 font-bold tracking-tight">
                          <Award className="w-3 h-3 mr-0.5 shrink-0" /> Rep Active
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/40 text-[11px] font-normal italic">--</span>
                      )}
                    </TableCell>

                    {/* Location Access */}
                    <TableCell>
                      {member.accessAllLocations ? (
                        <div className="flex items-center gap-1 font-bold text-indigo-600 bg-indigo-500/5 border border-indigo-500/10 rounded-md px-1.5 py-0.5 max-w-max text-[10px]">
                          <Warehouse className="w-3 h-3 text-indigo-500" /> Global Facilities
                        </div>
                      ) : member.assignedLocations.length === 0 ? (
                        <span className="text-[10px] text-destructive font-medium flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-destructive" /> Isolation Mode (0 sites)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {member.assignedLocations.map((loc, index) => (
                            <span 
                              key={index} 
                              className="bg-muted border font-mono font-bold text-[9px] px-1 py-0.5 rounded text-muted-foreground select-none"
                              title={loc.name}
                            >
                              {loc.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>

                    {/* Permissions Count */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono font-bold text-foreground">
                          {member.rightsList.length}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {member.isActive ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-300" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{member.isActive ? "Active directory token profile" : "Suspended account access"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="p-3.5 pr-5 align-top text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontalIcon />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/team-members/${member.id}/edit`}>
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" asChild>
                            <DeleteButton
                              itemId={member.id} 
                              itemName={member.name} 
                              endpointUrl={`/api/admin/team-members/${member.id}`}
                              onSuccess={() => mutate()} 
                              variant="full"
                            />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination
            pageIndex={pageIndex}
            pageSize={PAGE_SIZE}
            pageCount={pageCount}
            totalRecords={totalRecords}
            loading={isLoading}
            onPageChange={(nextIndex: number) => setPageIndex(nextIndex)}
          />
        </div>
      )}
    </div>
  );
}