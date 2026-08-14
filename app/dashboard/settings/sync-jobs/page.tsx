"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CloudSync,
  Loader2,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Play,
  Clock,
  Ban,
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface SyncJob {
  id: string;
  source: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled" | "retrying";
  progress: number;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  processedRecords?: number;
  totalRecords?: number;
}

export default function SyncQueueWorkspace() {
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const limit = 20;

  // Dialog States
  const [cancelJobId, setCancelJobId] = useState<string | null>(null);
  const [isClearQueueOpen, setIsClearQueueOpen] = useState<boolean>(false);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // Fetch Jobs List from Paginated API Endpoint
  const fetchJobs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusFilter,
        source: sourceFilter,
        search: searchTerm,
      });

      const res = await fetch(`/api/sync/list?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load sync jobs");

      const data = await res.json();
      setJobs(data.jobs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalJobs(data.pagination?.totalJobs || 0);
    } catch (err: any) {
      toast.error(err.message || "Error loading jobs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter, sourceFilter, searchTerm]);

  // Reset to page 1 whenever filters change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleSourceChange = (val: string) => {
    setSourceFilter(val);
    setPage(1);
  };

  // Poll for job updates every 3 seconds
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(() => {
      fetchJobs(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs(true);
  };

  const handleCancelJob = async () => {
    if (!cancelJobId) return;
    try {
      setIsProcessingAction(true);
      const res = await fetch("/api/sync/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: cancelJobId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel job");

      toast.success("Job cancelled successfully");
      fetchJobs(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel job");
    } finally {
      setIsProcessingAction(false);
      setCancelJobId(null);
    }
  };

  const handleClearQueue = async () => {
    try {
      setIsProcessingAction(true);
      const res = await fetch("/api/sync/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear queue");

      toast.success(data.message || "Sync queue cleared successfully");
      fetchJobs(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to clear queue");
    } finally {
      setIsProcessingAction(false);
      setIsClearQueueOpen(false);
    }
  };

  // Dynamic status badges mapping
  const getStatusBadge = (status: SyncJob["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </Badge>
        );
      case "processing":
      case "pending":
      case "retrying":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> {status}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" /> Failed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1">
            <Ban className="w-3 h-3" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activeCount = jobs.filter((j) =>
    ["pending", "processing", "retrying"].includes(j.status)
  ).length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;
  const cancelledCount = jobs.filter((j) => j.status === "cancelled").length;

  const sources = Array.from(new Set(jobs.map((j) => j.source))).filter(Boolean);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CloudSync className="w-6 h-6 text-primary" /> Cloud Sync Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor real-time synchronization jobs, inspect progress, and manage worker queues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsClearQueueOpen(true)}
            disabled={activeCount === 0 && jobs.length === 0}
            className="gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purge Queue
          </Button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase flex items-center justify-between">
              Active Jobs
              <Play className="w-4 h-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl">{activeCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase flex items-center justify-between">
              Completed
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl">{completedCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase flex items-center justify-between">
              Failed
              <XCircle className="w-4 h-4 text-destructive" />
            </CardDescription>
            <CardTitle className="text-2xl">{failedCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase flex items-center justify-between">
              Cancelled
              <Ban className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl">{cancelledCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Control Panel: Filters and Search */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Job ID, source, or errors..."
              className="pl-8"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground hidden md:block" />

            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={handleSourceChange}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map((src) => (
                  <SelectItem key={src} value={src}>
                    {src.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Queue Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading queue state...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-2">
              <Database className="w-10 h-10 text-muted-foreground/50" />
              <p className="font-semibold text-base">No sync jobs found</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                There are no jobs matching your current filter criteria or queue history is empty.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y border-t">
                {jobs.map((job) => {
                  const isActive = ["pending", "processing", "retrying"].includes(job.status);

                  return (
                    <div
                      key={job.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                    >
                      {/* Left Details */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted">
                            {job.id}
                          </span>
                          {getStatusBadge(job.status)}
                          <Badge variant="outline" className="text-xs capitalize">
                            {job.source.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        <div className="space-y-1 max-w-md pt-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{Math.round(job.progress)}%</span>
                          </div>
                          <Progress value={job.progress} className="h-1.5" />
                        </div>

                        {job.error && (
                          <p className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded mt-2">
                            {job.error}
                          </p>
                        )}
                      </div>

                      {/* Right Metadata & Controls */}
                      <div className="flex items-center justify-between md:justify-end gap-4 text-xs text-muted-foreground border-t md:border-t-0 pt-2 md:pt-0">
                        <div className="flex flex-col md:items-end">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Created:{" "}
                            {new Date(job.createdAt).toLocaleTimeString()}
                          </span>
                          <span>Updated: {new Date(job.updatedAt).toLocaleTimeString()}</span>
                        </div>

                        {isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelJobId(job.id)}
                            className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Toolbar */}
              <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                  Page <span className="font-medium text-foreground">{page}</span> of{" "}
                  <span className="font-medium text-foreground">{totalPages}</span> ({totalJobs}{" "}
                  items total)
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancel Single Job Modal */}
      <AlertDialog open={!!cancelJobId} onOpenChange={() => setCancelJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Job Execution?</AlertDialogTitle>
            <AlertDialogDescription>
              This will signal the background worker to halt processing for job{" "}
              <strong>{cancelJobId}</strong> immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingAction}>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelJob}
              disabled={isProcessingAction}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isProcessingAction ? "Cancelling..." : "Confirm Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purge Entire Queue Modal */}
      <AlertDialog open={isClearQueueOpen} onOpenChange={setIsClearQueueOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Purge Entire Sync Queue?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action pauses the queue worker, removes all{" "}
              <strong>waiting, delayed, and active</strong> jobs, and resets queue state.
              Running sync workers will be stopped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearQueue}
              disabled={isProcessingAction}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessingAction ? "Purging Queue..." : "Yes, Purge Queue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}