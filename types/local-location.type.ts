export const PAYMENT_STATUS: Record<number, string> = {
  0: "None",
  1: "Unpaid",
  2: "Partially Paid",
  3: "Paid",
  4: "Overpaid",
  5: "Paid",
  6: "Credit",
};

export const INVENTORY_STATUS: Record<number, string> = {
  0: "None",
  1: "Unfulfilled",
  2: "Started",
  3: "Fulfilled",
  4: "Completed",
};

export const ADDRESS_TYPE: Record<number, string> = {
  0: "Not Specified",
  1: "Commercial",
  2: "Residential",
};

export const ADDRESS_TYPE_MAP: Record<string, number> = {
  "Commercial": 1,
  "Residential": 2,
};

// Maps UI Select values (string) -> API ItemType (number)
export const UI_TO_API_ITEM_TYPE: Record<string, number> = {
  Stock: 0,
  Serialized: 1,
  NonStock: 2,
  Service: 3,
};

// Maps API ItemType (number) -> UI Select values (string)
export const API_TO_UI_ITEM_TYPE: Record<number, string> = {
  0: "Stock",
  1: "Serialized",
  2: "NonStock",
  3: "Service",
};