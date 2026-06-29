// app/admin/team-members/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users, Shield, Warehouse, Edit3, Trash2, CheckCircle2, XCircle, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

export default function TeamMembersListPage() {
  const [roster, setRoster] = useState<MemberRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoster = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/team-members/list");
      if (res.ok) {
        const payload = await res.json();
        setRoster(payload);
      }
    } catch (err) {
      toast.error("Roster Load Failure", { description: "Failed compiling account access matrix profiles indices data." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  const handleArchiveMember = async (id: string, name: string, taskCount: number) => {
    if (taskCount > 0) {
      toast.error("Safety Violation", { 
        description: `Cannot drop "${name}". Operative has ${taskCount} active orders, purchase confirmations, or sales portfolios bound to account.` 
      });
      return;
    }

    if (!confirm(`Are you certain you want to soft-delete "${name}" from the enterprise active user directory? This will drop authorization keys.`)) return;

    try {
      const res = await fetch("/api/admin/team-members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error();
      toast.success("Personnel record archived safely");
      setRoster(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      toast.error("Pipeline Drop Rejected", { description: "Database transaction model constraints blocked deletion rules configuration sequence." });
    }
  };

  const filteredRoster = roster.filter(m => {
    const term = searchQuery.toLowerCase().trim();
    return (
      m.name.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      m.inflowId.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-xs">
      
      {/* Navigation Header Panel block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Active Team Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage enterprise clearance rules settings, physical warehouse access configurations, and system authorization tokens tracking handles.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/team-members/create">
            <Plus className="w-4 h-4" /> Provision New Member
          </Link>
        </Button>
      </div>

      {/* Roster Controls Utilities */}
      <div className="w-full sm:max-w-xs relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Search directory name, email handle, or system token..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs h-9"
        />
      </div>

      {/* Grid Rendering Table Content area */}
      {isLoading ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
          Parsing systemic active credential indices and access profiles maps array tree structures...
        </div>
      ) : filteredRoster.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No personnel files mapped matching current directory search parameters query strings.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-5 w-[180px]">Identity Handle Profile</th>
                  <th className="p-4 w-[240px]">Email Coordinates</th>
                  <th className="p-4 text-center w-[110px]">Sales Capability</th>
                  <th className="p-4 w-[220px]">Physical Space Scope Clearances</th>
                  <th className="p-4 w-[110px] text-center">Privileges Count</th>
                  <th className="p-4 text-center w-[90px]">Status</th>
                  <th className="p-4 text-right pr-5 w-[100px]">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filteredRoster.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/5 transition-colors">
                    
                    {/* Identification tracking handles column cell */}
                    <td className="p-4 pl-5 font-medium">
                      <div className="font-semibold text-foreground text-[13px]">{member.name}</div>
                      <div className="font-mono text-[9px] text-muted-foreground mt-0.5 tracking-tight uppercase">
                        {member.inflowId}
                      </div>
                    </td>

                    {/* Email anchor endpoint layout box cell */}
                    <td className="p-4 text-muted-foreground font-mono select-all">
                      {member.email}
                    </td>

                    {/* Sales representation allocation capability flag marker */}
                    <td className="p-4 text-center">
                      {member.canBeSalesRep ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/5 text-emerald-600 border-emerald-500/20 font-bold tracking-tight">
                          <Award className="w-3 h-3 mr-0.5 shrink-0" /> Rep Active
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/40 text-[11px] font-normal italic">--</span>
                      )}
                    </td>

                    {/* Spatial access mapping boundary listings strings column */}
                    <td className="p-4">
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
                    </td>

                    {/* Total explicit authorization parameters tally counter node */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono font-bold text-foreground">
                          {member.rightsList.length}
                        </span>
                      </div>
                    </td>

                    {/* Logistical operational execution visibility toggle marker switch icon */}
                    <td className="p-4 text-center">
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
                    </td>

                    {/* Command operational buttons block row triggers */}
                    <td className="p-4 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Adjust Operative Access Controls">
                          <Link href={`/dashboard/team-members/${member.id}/edit`}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleArchiveMember(member.id, member.name, member.totalAssignedTasks)}
                          disabled={member.totalAssignedTasks > 0}
                          className={`h-8 w-8 ${
                            member.totalAssignedTasks > 0 
                              ? "text-muted-foreground/30 cursor-not-allowed opacity-40" 
                              : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                          }`}
                          title={member.totalAssignedTasks > 0 ? `Locked: Bound to ${member.totalAssignedTasks} operational records rows links.` : "Archive account profile records nodes."}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}