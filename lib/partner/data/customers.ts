import { InflowCustomer } from "@/lib/inflow/types";
import { partnerApi } from "../partner.client"
import { partnerTestApi } from "../partnerTest.client";

export async function getCustomer(
  batchId: string
) {
  return await partnerApi.get<InflowCustomer>(
    `/customers/${batchId}`,
  );
}

export async function upsertCustomer(
  data: InflowCustomer
) {

  return await partnerApi.put<InflowCustomer>(
    `/customers`,
    data
  );
}

export async function upsertTestCustomer(
  data: InflowCustomer
) {

  return await partnerTestApi.post<InflowCustomer>(
    `/inbound/receive`,
    {
      "eventType": "CustomerCreated",
      "transactionType": "CUSTOMER",
      "batch_id": "CUSTOMER-SM_NORTH-TEST004",
      "sourceSystem": "HQ",
      "sourceKey": "HQ",
      "payload": data
    }
  );
}





