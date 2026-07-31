"use client";

import { useState } from "react";
import { toast } from "sonner"; // or your toast library
import {
  generateSequentialSerials,
  filterUniqueSerials,
  autoDistributeSerialsToBins,
  BinWithSerialCapacity,
  AutofillSerialOptions,
} from "@/utils/serial.utility";

export function InventorySerialManager() {
  const [loading, setLoading] = useState(false);
  const [bins, setBins] = useState<BinWithSerialCapacity[]>([
    { sublocationId: "bin-1", quantity: 5, serials: [] },
    { sublocationId: "bin-2", quantity: 3, serials: [] },
  ]);

  const handleAutofillAndDistribute = async () => {
    setLoading(true);

    try {
      const totalNeeded = bins.reduce((acc, bin) => acc + bin.quantity, 0);

      const options: AutofillSerialOptions = {
        prefix: "SN-",
        startingIndex: 1,
        digitPadding: 4,
      };

      // 1. Generate sequential candidates
      const candidates = generateSequentialSerials(totalNeeded, options);

      // 2. Query API route to verify against DB
      const res = await fetch("/api/admin/inventory/serials/verify-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serials: candidates }),
      });

      if (!res.ok) throw new Error("Server error verifying serials");

      const { existingSerials: dbExistingSerials } = await res.json();

      // 3. Collect serials already present in local form state
      const localExistingSerials = bins.flatMap((b) => b.serials || []);

      // 4. Filter duplicates (both local & DB)
      const validSerials = filterUniqueSerials(candidates, [
        ...localExistingSerials,
        ...dbExistingSerials,
      ]);

      if (validSerials.length < candidates.length) {
        const skippedCount = candidates.length - validSerials.length;
        toast.warning(`Skipped ${skippedCount} duplicate serial(s) found in DB or Form.`);
      }

      // 5. Distribute unique serials across bins
      const updatedBins = autoDistributeSerialsToBins(bins, validSerials);
      setBins(updatedBins);

      toast.success("Serials generated and distributed successfully!");
    } catch (err) {
      toast.error("Failed to generate and assign serials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleAutofillAndDistribute}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? "Verifying..." : "Auto-Generate & Assign Serials"}
      </button>

      {/* Render Bins and assigned serials */}
      <div className="grid gap-2">
        {bins.map((bin) => (
          <div key={bin.sublocationId} className="border p-3 rounded">
            <p className="font-semibold">Bin: {bin.sublocationId}</p>
            <p className="text-sm text-gray-500">
              Assigned ({bin.serials?.length || 0} / {bin.quantity}):
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              {bin.serials?.map((sn) => (
                <span key={sn} className="bg-gray-100 text-xs px-2 py-1 rounded">
                  {sn}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}