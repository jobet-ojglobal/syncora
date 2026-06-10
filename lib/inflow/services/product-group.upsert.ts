import { prisma } from "@/lib/prisma";
import { CreateProductGroupInput } from "@/schemas/product-group.schema";
import { syncProductGroup } from "./product-group-sync";
import { getProductGroup, upsertProductGroup } from "../data/product-group";

// Interface for what you'll pass down to the external upsertProductGroup API call
export interface InflowOptionValuePayload {
  lineNum: string; // explicitly a string in inFlow docs
  productGroupOptionValueId: string;
  value: string;
}

export interface InflowOptionPayload {
  lineNum: string; // explicitly a string in inFlow docs
  name: string;
  productGroupOptionId: string;
  optionValues: InflowOptionValuePayload[];
}

export interface InflowGroupPayload {
  productGroupId: string;
  name: string;
  isActive: boolean;
  options: InflowOptionPayload[];
}

// Mocking your external SDK/API call wrapper based on your snippet

export async function createProductGroupToInflow(input: CreateProductGroupInput) {
  // 1. Enforce validation rule: groups need at least one option array block
  if (!input.options || input.options.length === 0) {
    throw new Error("Cannot create a Product Group in inFlow without providing at least one variation option.");
  }

  // 2. Provision the top-level parent entity GUID
  const generatedGroupId = crypto.randomUUID();

  // 3. Transform the form array structures into compliant inFlow sub-objects
  const transformedOptions: InflowOptionPayload[] = input.options.map((option, optIdx) => {
    // Generate individual option block GUID (e.g., for "Color")
    const optionGuid = crypto.randomUUID();
    
    // Calculate and format positional lines matching inFlow specifications (incrementing by 100 or sequential strings)
    const optionLineNum = ((optIdx + 1) * 100).toString();

    return {
      lineNum: optionLineNum,
      name: option.name.trim(),
      productGroupOptionId: optionGuid,
      optionValues: option.values.map((valObj, valIdx) => {
        // Generate child variant attribute item value GUID (e.g., for "Red")
        const valueGuid = crypto.randomUUID();
        const valueLineNum = ((valIdx + 1) * 100).toString();

        return {
          lineNum: valueLineNum,
          productGroupOptionValueId: valueGuid,
          value: valObj.value.trim(),
        };
      }),
    };
  });

  // 4. Construct unified payload matching inFlow payload parameters perfectly
  const inflowPayload: InflowGroupPayload = {
    productGroupId: generatedGroupId,
    name: input.name,
    isActive: input.isActive,
    options: transformedOptions,
  };

  // 5. Fire outward payload to external inFlow endpoints
  const inflowProductGroupResponse = await upsertProductGroup(inflowPayload);
  // 6. Execute atomic local write transaction with the normalized response
  const localDbRecord = await prisma.$transaction(async (tx) => {
    const productGroup = await getProductGroup(inflowProductGroupResponse.productGroupId);
    const res = await prisma.$transaction(async (tx) => {
      await syncProductGroup(tx, productGroup);
    });
    return res;
  });

  return localDbRecord;
}