"use client";

import useSWR from "swr";
import { useLocationWorkspace } from "@/context/LocationWorkspaceContext";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function LocationInventoryWidget() {
  const { activeLocation } = useLocationWorkspace();

  // Conditionally fetch data based on whether activeLocation.id exists
  const { data: inventory, isLoading } = useSWR(
    activeLocation ? `/api/inventory?locationId=${activeLocation.id}` : null,
    fetcher
  );

  if (!activeLocation) {
    return <div>Select a workspace location to view inventory.</div>;
  }

  return (
    <div>
      <h3 className="text-sm font-bold">Inventory for {activeLocation.name}</h3>
      {isLoading ? (
        <p>Loading stock counts...</p>
      ) : (
        <pre>{JSON.stringify(inventory, null, 2)}</pre>
      )}
    </div>
  );
}