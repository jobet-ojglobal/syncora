import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, RotateCcw } from "lucide-react";

export  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "POSTED":
        return (
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-2.5 py-1">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
            Approved / Posted
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border-amber-500/30 px-2.5 py-1">
            <Clock className="w-3 h-3 mr-1 text-amber-500" />
            Draft Mode
          </Badge>
        );
      case "VOIDED":
        return (
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border-rose-500/30 px-2.5 py-1">
            <AlertCircle className="w-3 h-3 mr-1 text-rose-500" />
            Cancelled
          </Badge>
        );
      case "REVERTED":
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 border-purple-500/30 px-2.5 py-1"
          >
            <RotateCcw className="w-3 h-3 mr-1 text-purple-500" />
            Reverted
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };