import { InflowTaxCode} from "@/lib/inflow/types";
import { BranchClient } from "../location.client";

export async function getTaxCode(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowTaxCode>(
    `/inflow-local/payload/${batchId}`,
  );
}
