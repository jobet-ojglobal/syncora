// app/admin/customers/loading.tsx
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="p-24 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground italic">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
        Retrieving customer ledger and operational parameters...
    </div>
  );
}