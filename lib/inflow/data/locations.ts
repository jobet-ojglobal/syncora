import { inflow } from "@/lib/inflow/inflow.client";
import { InflowLocation, InflowProductLocationSublocation, InflowSuggestedSublocations } from "../types";

export async function getLocations() {
  const data = await inflow.get<InflowLocation[]>(
    "/locations"
  );
  return data;
}

export async function getLocation(locationId: string) {
  const data = await inflow.get<InflowLocation>(
    `/locations/${locationId}`
  );
  return data;
}

export async function getSublocationsByProductAndLocation(
    locationId: string, 
    productId: string
) {
  const data = await inflow.get<InflowProductLocationSublocation[]>(
    `/locations/${locationId}/products/${productId}/suggested-sublocations`
  );
  return data;
}

export async function getSublocationsByLocation(
    locationId: string
) {
  const data = await inflow.get<InflowSuggestedSublocations>(
    `/locations/${locationId}/suggested-sublocations`
  );
  return data;
}
