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

