import { ProductType, ReorderSettingMethod } from "@/generated/prisma/enums";


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


export const reorderMethodSwitcher = (type: string) => {
  let newType: ReorderSettingMethod = "PurchaseOrder" ;
  switch (type) {
    case "purchaseOrder":
      newType = "PurchaseOrder";
      break;
    case "transferOrder":
      newType = "StockTransfer";
      break;
    default:
      newType = "PurchaseOrder"
      break;
  }
  return newType
} 


//  Local Mappers

export const localReorderMethodSwitcher = (type: number) => {
  let newType: ReorderSettingMethod = "PurchaseOrder" ;
  switch (type) {
    case 1:
      newType = "PurchaseOrder";
      break;
    case 2:
      newType = "StockTransfer";
      break;
    default:
      newType = "PurchaseOrder"
      break;
  }
  return newType
} 


export const  localProductItemType = (type: number) => {
  switch (type) {
    case 1:
      return "stockedProduct";
    case 2:
      return "nonstockedProduct";
    case 3:
      return "service";
    default:
      return "stockedProduct";
  }
}