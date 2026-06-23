// import { inflow } from "@/lib/inflow/inflow.client";

// export async function getVendors( count = 100,
//   after?: string
// ) {
//   const params = new URLSearchParams({
//     count: String(count),
//   });

//   if (after) {
//     params.append("after", after);
//   }

//   return await inflow.get<InflowVendor[]>(
//     `/vendors?${params.toString()}`
//   );

// }

// export async function getVendor(vendorId: string) {
//   return inflow.get(`/vendors/${vendorId}`);
// }

// export async function createVendor(data: any) {
//   return inflow.post("/vendors", data);
// }