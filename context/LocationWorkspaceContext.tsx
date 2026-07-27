"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import useSWR from "swr";

export interface LocationItem {
  id: string;
  name: string;
  url?: string | null;
  isOnline: boolean;
}

interface LocationWorkspaceContextType {
  locations: LocationItem[] | undefined;
  currentLocationId: string;
  activeLocation: LocationItem | null;
  isLoading: boolean;
  isBrowserOnline: boolean;
  changeLocation: (id: string) => void;
  mutateLocations: () => void;
}

const LocationWorkspaceContext = createContext<LocationWorkspaceContextType | undefined>(undefined);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const LocationWorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  // 1. Fetch entire workspace statuses globally via SWR
  const { data: locations, isLoading, mutate } = useSWR<LocationItem[]>(
    "/api/admin/locations/webhooks",
    fetcher,
    {
      refreshInterval: 15000, // Sync status of all nodes every 15 seconds
    }
  );

  const [currentLocationId, setCurrentLocationId] = useState<string>("");
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(false);

  // Sync client-side network state on mount (prevents SSR hydration warnings)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsBrowserOnline(window.navigator.onLine);
    }

    const handleOnline = () => {
      setIsBrowserOnline(true);
      mutate();
    };
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [mutate]);

  // Sync selected location ID with local storage / default fallback
  useEffect(() => {
    if (locations && locations.length > 0) {
      const savedId = localStorage.getItem("selectedLocationId");
      if (savedId && locations.some((loc) => loc.id === savedId)) {
        setCurrentLocationId(savedId);
      } else if (!currentLocationId) {
        setCurrentLocationId(locations[0].id);
      }
    }
  }, [locations, currentLocationId]);

  const changeLocation = (id: string) => {
    setCurrentLocationId(id);
    localStorage.setItem("selectedLocationId", id);
  };

  const activeLocation = useMemo(() => {
    if (!locations || locations.length === 0) return null;
    return locations.find((loc) => loc.id === currentLocationId) || locations[0];
  }, [locations, currentLocationId]);

  return (
    <LocationWorkspaceContext.Provider
      value={{
        locations,
        currentLocationId,
        activeLocation,
        isLoading,
        isBrowserOnline,
        changeLocation,
        mutateLocations: mutate,
      }}
    >
      {children}
    </LocationWorkspaceContext.Provider>
  );
};

export const useLocationWorkspace = () => {
  const context = useContext(LocationWorkspaceContext);
  if (!context) {
    throw new Error("useLocationWorkspace must be used within a LocationWorkspaceProvider");
  }
  return context;
};