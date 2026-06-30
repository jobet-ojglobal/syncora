export type ProductRow = {
  id: string;
  inflowProductId: string;
  sku: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  standardUomName: string | null;

  brand: {
    id: string;
    name: string;
  } | null;

  variant?: ProductVariant
};

export interface ProductVariant {
  defaultPrice: string;
  group?: ProductGroup;
}

export interface ProductGroup {
  name: string;
  category?: Category | null;
}

export interface Category {
  id: string;
  name: string;
}