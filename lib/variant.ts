export function validateVariantAttributes(
  attributeValues: {
    id: string;

    attributeId: string;
  }[]
) {
  const seen =
    new Set<string>();

  for (const value of attributeValues) {
    if (
      seen.has(
        value.attributeId
      )
    ) {
      throw new Error(
        `Duplicate attribute detected for attributeId: ${value.attributeId}`
      );
    }

    seen.add(
      value.attributeId
    );
  }

  return true;
}