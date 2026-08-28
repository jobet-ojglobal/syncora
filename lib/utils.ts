import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getVariantColor(variant: any) {
  const colorAttribute = variant.attributes?.find(
    (attr: any) => attr.attribute?.name?.toLowerCase() === 'color'
  );

  if (!colorAttribute) return undefined;

  return {
    id: colorAttribute.id,
    name: colorAttribute.value,
    hexCode: colorAttribute.hexCode,
  };
}

export function serializeVariant(variant: any) {
  return {
    ...variant,
    color: getVariantColor(variant),
    price: variant.price?.toNumber ? variant.price.toNumber() : Number(variant.price),
    createdAt: variant.createdAt?.toISOString?.(),
    updatedAt: variant.updatedAt?.toISOString?.(),
  };
}
