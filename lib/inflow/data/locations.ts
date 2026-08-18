import { inflow } from "@/lib/inflow/inflow.client";
import { InflowLocation, InflowProductLocationSublocation, InflowSuggestedSublocations } from "../types";

export async function getAllLocations() {
  const data = await inflow.get<InflowLocation[]>(
    "/locations"
  );
  return data;
}

export async function getLocations(
  count = 30,
  after?: string,
  retries: number =  5,
  delayMs: number = 1000,
  isActive: boolean = true
) {
  const params = new URLSearchParams({
    count: String(count),
  });

  if (after) {
    params.append("after", after);
  }

  return inflow.get<InflowLocation[]>(
    `/locations?${params.toString()}`,
    retries,
    delayMs
  );
}


export async function getSingleLocation(
  locationId: string,
  retries: number =  5,
  delayMs: number = 1000
) {
  const params = new URLSearchParams({
    // includes: "product"
  });

  const data = inflow.get<InflowLocation>(
    `/locations/${locationId}?${params.toString()}`,
    retries,
    delayMs
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
