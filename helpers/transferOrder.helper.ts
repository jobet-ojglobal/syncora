export const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
      case "PENDING":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300";
      case "IN_TRANSIT":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300";
      case "RECEIVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300";
      case "PARTIALLY_RECEIVED":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300";
      case "RECEIVED_DISCREPANCY":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

export const formatReasonLabel = (reason?: string | null) => {
    if (!reason) return "N/A";
    switch (reason) {
      case "DAMAGED_IN_TRANSIT":
        return "Damaged In Transit";
      case "MISSING_BOX":
        return "Missing Box / Shrinkage";
      case "VENDOR_SHORTAGE":
        return "Vendor / Dispatch Shortage";
      case "OVERAGE_UNCOUNTED":
        return "Overage / Extra Shipped";
      case "OTHER":
        return "Other Variance";
      default:
        return reason;
    }
  };