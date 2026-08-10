
export function formatAdjustReasonLabel(reason: string): string {
  const map: Record<string, string> = {
    STOCK_COUNT: "Restock",
    DAMAGE: "Damaged",
    LOSS: "Write-off",
    THEFT: "Stolen",
    EXPIRED: "Expired",
    RETURN: "Return",
    CORRECTION: "Correction",
    MANUAL: "Other",
  };
  return map[reason] || reason;
}
