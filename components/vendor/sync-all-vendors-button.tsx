"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react"; // Or any icon package you use
import { useRouter } from "next/navigation";

export default function SyncAllVendorsButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const handleBulkSync = async () => {
    try {
      setIsSyncing(true);
      
      const response = await fetch("/api/admin/vendors/sync", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Sync pipeline execution failed.");
      
      const data = await response.json();
      alert(`Success! Enqueued ${data.count} vendors for synchronization.`);
      
      router.refresh(); // Refresh server component data if necessary
    } catch (error) {
      console.error(error);
      alert("Something went wrong spinning up the sync engine.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      onClick={handleBulkSync}
      disabled={isSyncing}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-all"
    >
      <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
      {isSyncing ? "Syncing Directory..." : "Sync All to inFlow"}
    </button>
  );
}