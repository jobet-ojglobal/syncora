// services/product-group-option.service.ts
import { prisma } from "@/lib/prisma";

interface AssignAttributesInput {
  productGroupId: string; // The inflowProdGroupId GUID of your ProductGroup
  attributes: {
    attributeId: string;
    name: string;
    lineNum: number;
    selectedValues: {
      attributeValueId: string;
      value: string;
      lineNum: number;
    }[];
  }[];
}

export async function assignGroupAttributes(input: AssignAttributesInput) {
  const transactionOperations = input.attributes.map((attr) => {
    const generatedOptionInflowId = crypto.randomUUID();

    return prisma.productGroupOption.create({
      data: {
        inflowId: generatedOptionInflowId,
        productGroupId: input.productGroupId,
        name: attr.name,
        lineNum: attr.lineNum,
        
        // Link to the global master Attribute model
        attributeId: attr.attributeId,
        
        // Simultaneously create the selected child values
        values: {
          create: attr.selectedValues.map((val) => ({
            inflowId: crypto.randomUUID(),
            value: val.value,
            lineNum: val.lineNum,
            // Link to the global master AttributeValue model
            attributeValueId: val.attributeValueId,
          })),
        },
      },
    });
  });

  // Execute all creations safely inside a database transaction
  return await prisma.$transaction(transactionOperations);
}