"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterX, RefreshCw } from "lucide-react";
import { DataTablePagination } from "../shared/data-table-pagination";
import { INFLOW_EVENTS } from "@/lib/locations/types/webhook.type";

interface WebhookLog {
  id: string;
  eventType: string;
  processed: boolean;
  receivedAt: string;
  payload: Record<string, any>;
}

interface WebhookLogsTabProps {
  locationId: string;
}

const PAGE_SIZE = 10;

export const WebhookLogsTab = ({ locationId }: WebhookLogsTabProps) => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("ALL");
  const [pageIndex, setPageIndex] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  // Fetch telemetry logs scoped to location, event type, and pagination
  const fetchLogs = useCallback(async () => {
    if (!locationId) return;

    setLoadingLogs(true);
    try {
      const eventParam = selectedEvent === "ALL" ? "" : selectedEvent;
      const endpoint = `/api/settings/webhooks/locations/logs?locationId=${locationId}&eventType=${eventParam}&page=${pageIndex}&limit=${PAGE_SIZE}`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.success) {
        setLogs(data.logs || []);
        setTotalRecords(data.totalRecords || 0);
        setPageCount(data.pageCount || 0);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, [locationId, selectedEvent, pageIndex]);

  // Re-query logs when dependencies change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset pagination index when changing filter topic
  const handleFilterChange = (value: string) => {
    setSelectedEvent(value);
    setPageIndex(0);
  };

  return (
    <Card className="shadow-2xs border-border/60">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 pb-4 border-b">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            Recent Activity Log
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Live processing timeline evaluating structural inbound mutations received from your local hardware hook configurations channels.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          {/* Dynamic filter selector */}
          <Select value={selectedEvent} onValueChange={handleFilterChange}>
            <SelectTrigger className="h-8 w-[190px] text-[11px] font-medium bg-background">
              <SelectValue placeholder="All Incoming Topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                All Event System Operations
              </SelectItem>
              {INFLOW_EVENTS.map((event) => (
                <SelectItem
                  key={event}
                  value={event}
                  className="text-xs font-mono"
                >
                  {event}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="h-8 gap-1.5 font-medium text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {loadingLogs && logs.length === 0 ? (
          <div className="text-center py-16 text-xs text-muted-foreground italic animate-pulse">
            Querying database indexes and aggregating location historical runtime telemetry lines...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-14 border border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/10">
            <FilterX className="w-8 h-8 text-muted-foreground/40 stroke-[1.5]" />
            <p className="text-xs font-medium">
              No event records match your parameters choice filters boundaries.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-3xs">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase border-b">
                    <th className="p-3 pl-4">Event Topic Context</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Received Timestamp</th>
                    <th className="p-3 text-right pr-4">Payload Inspection</th>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs font-medium">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/5 transition-colors border-b last:border-b-0"
                    >
                      <td className="p-3 pl-4 font-mono text-[11px] font-semibold text-foreground">
                        {log.eventType}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={log.processed ? "default" : "secondary"}
                          className={`text-[9px] font-bold tracking-wide rounded-sm border px-1.5 py-0 ${
                            log.processed
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10"
                          }`}
                        >
                          {log.processed ? "Processed" : "Logged"}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(log.receivedAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-right pr-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-[11px] font-medium shadow-3xs"
                            >
                              Inspect JSON
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col text-xs">
                            <DialogHeader className="border-b pb-3">
                              <DialogTitle className="font-mono text-sm tracking-tight text-foreground flex items-center gap-2">
                                <span>Inspector Log Context:</span>
                                <span className="text-primary font-bold">
                                  {log.eventType}
                                </span>
                              </DialogTitle>
                            </DialogHeader>
                            <div className="bg-muted/60 border mt-2 p-4 rounded-xl overflow-y-auto font-mono text-xs text-foreground/95 flex-1 select-all whitespace-pre-wrap shadow-inner max-h-[500px]">
                              {JSON.stringify(log.payload, null, 2)}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Server-driven responsive pagination */}
            <DataTablePagination
              pageIndex={pageIndex}
              pageSize={PAGE_SIZE}
              pageCount={pageCount}
              totalRecords={totalRecords}
              loading={loadingLogs}
              onPageChange={(nextIndex: number) => setPageIndex(nextIndex)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};