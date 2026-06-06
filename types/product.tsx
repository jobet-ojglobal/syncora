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
};