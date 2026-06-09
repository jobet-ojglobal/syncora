// modules/products/types/product.dto.ts

export interface UpsertProductDto {
  sku: string;
  name: string;

  description?: string;

  categoryId?: string;

  itemType?: "StockedProduct" | "Service";

  isActive?: boolean;

  weight?: string;
  length?: string;
  width?: string;
  height?: string;

  hsTariffNumber?: string;
  originCountry?: string;

  remarks?: string;
}