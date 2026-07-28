import { ProductType } from "@/generated/prisma/enums";


export const productTypeSwitcher = (type: string) => {
  let newType: ProductType = "StockedProduct" ;
  switch (type) {
    case "stockedProduct":
      newType = "StockedProduct";
      break;
    case "nonstockedProduct":
      newType = "NonstockedProduct";
      break;
    case "service":
      newType = "Service";
      break;
    default:
      newType = "StockedProduct"
      break;
  }
  return newType
} 