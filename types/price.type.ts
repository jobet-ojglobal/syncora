// export enum PriceType {
//   FixedPrice = "FixedPrice",
//   PercentageDiscount = "PercentageDiscount",
//   AmountDiscount = "AmountDiscount",
//   MarkupPercentage = "MarkupPercentage",
//   MarkupAmount = "MarkupAmount",
//   CostPlus = "CostPlus",
//   Dynamic = "Dynamic",
//   Tiered = "Tiered",
//   Volume = "Volume",
//   CustomerSpecific = "CustomerSpecific",
//   Promotional = "Promotional",
//   Manual = "Manual",
// }

import { Currency } from "@/generated/prisma/client";

export const PRICE_TYPES = {
  FixedPrice: "FixedPrice",
  PercentageDiscount: "PercentageDiscount",
  AmountDiscount: "AmountDiscount",
  MarkupPercentage: "MarkupPercentage",
  MarkupAmount: "MarkupAmount",
  CostPlus: "CostPlus",
  Dynamic: "Dynamic",
  Tiered: "Tiered",
  Volume: "Volume",
  CustomerSpecific: "CustomerSpecific",
  Promotional: "Promotional",
  Manual: "Manual",
} as const;

export type PriceType =
  (typeof PRICE_TYPES)[keyof typeof PRICE_TYPES];


export interface PricingScheme {
  id: string;
  inflowId: string;
  currencyId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  isTaxInclusive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}


