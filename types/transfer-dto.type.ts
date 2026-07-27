export interface LineDetail {
  id: string;
  productName: string;
  productSku: string;
  sourceSublocationId?: string | null;
  targetSublocationId?: string | null;
  sourceBinName: string;
  targetBinName: string;
  quantity: number;
  quantityReceived?: number | null;
}

// export interface TransferOrderRow {
//   id: string;
//   transferNumber: string;
//   sourceLocationName: string;
//   targetLocationName: string;
//   status: "DRAFT" | "PENDING" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
//   remarks: string | null;
//   linesCount: number;
//   transferredAt: string | null;
//   receivedAt: string | null;
//   createdAt: string;
//   lines: LineDetail[];
// }

export interface TransferOrderLineRow {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  quantityReceived?: number | null;
  discrepancyQuantity?: number | null;
  discrepancyReason?: string | null;
  sourceSublocationId?: string | null;
  sourceSublocationName?: string | null;
  targetSublocationId?: string | null;
  targetSublocationName?: string | null;
}

export interface TransferOrderRow {
  id: string;
  transferNumber: string;
  sourceLocationId: string;
  sourceLocationName: string;
  targetLocationId: string;
  targetLocationName: string;
  status:
    | "DRAFT"
    | "PENDING"
    | "IN_TRANSIT"
    | "RECEIVED"
    | "PARTIALLY_RECEIVED"
    | "RECEIVED_DISCREPANCY"
    | "CANCELLED";
  remarks?: string | null;
  createdAt: string;
  transferredAt?: string | null;
  receivedAt?: string | null;
  createdByName?: string | null;
  approvedByName?: string | null;
  receivedByName?: string | null;
  lines: TransferOrderLineRow[];
}