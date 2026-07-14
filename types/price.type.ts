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