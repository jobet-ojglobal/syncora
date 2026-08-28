"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UserPlus,
  Edit3,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Users,
  KeyRound,
  Laptop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TooltipTrigger, Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "@/components/ui/table";

interface UserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: "Admin" | "TeamMember" | "Customer";
  teamMemberId: string | null;
  teamMemberName: string | null;
  inflowCustomerId: string | null;
  customerName: string | null;
  activeSessionsCount: number;
  linkedAccountsCount: number;
  createdAt: string;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to load platform authentication users.");
    return res.json();
  });

export default function UsersListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: payload,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(
    `/api/admin/users/filtered?search=${encodeURIComponent(
      debouncedSearch
    )}&page=${pageIndex}&limit=${PAGE_SIZE}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  const users: UserRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const renderRoleBadge = (role: UserRow["role"]) => {
    switch (role) {
      case "Admin":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-amber-500/20 text-[10px] font-bold px-1.5 py-0 rounded gap-1">
            <ShieldCheck className="w-3 h-3" /> Admin
          </Badge>
        );
      case "TeamMember":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 border-blue-500/20 text-[10px] font-bold px-1.5 py-0 rounded gap-1">
            <Briefcase className="w-3 h-3" /> Team Member
          </Badge>
        );
      case "Customer":
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/10 border-slate-500/20 text-[10px] font-bold px-1.5 py-0 rounded gap-1">
            <UserCheck className="w-3 h-3" /> Customer
          </Badge>
        );
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Hydration Failure: Failed resolving authentication identity matrix records.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader
        title="User Accounts Directory"
        description="Manage identity profiles, role-based governance access tiers, active login sessions, and linked business context mappings."
        icon={Users}
        className="border-b border-border pb-4"
      >
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/settings/users/new">
            <UserPlus className="w-4 h-4" /> Provision Account
          </Link>
        </Button>
      </PageHeader>

      <div className="w-full sm:max-w-md">
        <SearchInput
          placeholder="Filter users by name, email, account ID..."
          searchQuery={searchQuery}
          setSearchQuery={handleSearchChange}
          isLoading={isValidating && !isLoading}
        />
      </div>

      {isLoading && !payload ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
          Reindexing user directory vectors and mapping authentication permissions...
        </div>
      ) : users.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No identity profiles matched the specified search criteria parameters.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="pl-5 w-[280px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    User Profile
                  </TableHead>
                  <TableHead className="w-[130px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Role Tier
                  </TableHead>
                  <TableHead className="w-[200px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Entity Association
                  </TableHead>
                  <TableHead className="w-[100px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sessions
                  </TableHead>
                  <TableHead className="w-[100px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Auth
                  </TableHead>
                  <TableHead className="w-[90px] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Verified
                  </TableHead>
                  <TableHead className="pr-5 w-[100px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-medium">
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/5 transition-colors">
                    {/* Name, Email & Avatar */}
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={user.image || ""} alt={user.name} />
                          <AvatarFallback className="text-[10px] font-bold">
                            {user.name?.slice(0, 2).toUpperCase() || "US"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground text-[13px] truncate">
                            {user.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono truncate">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role Badge */}
                    <TableCell>{renderRoleBadge(user.role)}</TableCell>

                    {/* Entity Binding */}
                    <TableCell className="text-muted-foreground text-[11px]">
                      {user.teamMemberName ? (
                        <span className="text-foreground font-medium flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-muted-foreground" />
                          {user.teamMemberName}
                        </span>
                      ) : user.customerName ? (
                        <span className="text-foreground font-medium flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-muted-foreground" />
                          {user.customerName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">— None —</span>
                      )}
                    </TableCell>

                    {/* Active Sessions */}
                    <TableCell className="text-right font-mono text-foreground font-semibold text-xs pr-4">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <Laptop className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>{user.activeSessionsCount}</span>
                      </div>
                    </TableCell>

                    {/* Linked Auth Accounts */}
                    <TableCell className="text-right font-mono text-foreground font-semibold text-xs pr-4">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <KeyRound className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>{user.linkedAccountsCount}</span>
                      </div>
                    </TableCell>

                    {/* Email Verification Status */}
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              {user.emailVerified ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-slate-300" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {user.emailVerified
                                ? "Email address verified"
                                : "Unverified email address"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit User"
                        >
                          <Link href={`/dashboard/settings/users/${user.id}/edit`}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <DeleteButton
                          itemId={user.id}
                          itemName={user.name}
                          endpointUrl={`/api/admin/users/${user.id}`}
                          onSuccess={() => mutate()}
                          variant="icon"
                        />
                      </div>
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