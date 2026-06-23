import { inflow } from "@/lib/inflow/inflow.client";

export async function getCustomFields() {
  const response =
    await inflow.get(
      "/custom-fields"
    );

  return response;
}

export async function getCustomField(fieldID: string) {
  return inflow.get(`//custom-fields/${fieldID}`);
}
