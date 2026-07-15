import { BranchClient } from "../location.client";

export interface InflowProduct {
  productId: string;
  itemType: number;
  name: string;
  description: string;
  remarks: string;
  barcode: string;
  categoryId: string;
  defaultLocationId: string;
  defaultSublocation: string;

  reorderPoint: number;
  reorderQuantity: number;

  uom: string;
  masterPackQty: number;
  innerPackQty: number;

  timestamp: string;
  syncedAt: string;
}

export async function getCategories(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowProduct[]>(
    `/inflow-local/products`,
  );
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertProduct(
  payload: InflowProduct,
  url: string
) {
  const apiClient = new BranchClient(url)
  return await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "productLocal",
        "transactionType": "CATEGORY",
        "batch_id": `CTGRY-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": payload.productId,
        "payload": payload 
      }
  );
}

// {
//   "productId": "100",
//   "version": 3,
//   "itemType": 1,
//   "name": "1 SPOT MC5",
//   "description": "Truetone 1 Spot Pedalboard Multi-Plug Daisy Chain with 5 Multiple Plugs Cable",
//   "remarks": "",
//   "barcode": "694336000102",

//   "categoryId": "101",

//   "defaultLocationId": null,
//   "defaultSublocation": "",

//   "reorderPoint": "1.0000",
//   "reorderQuantity": "1.0000",

//   "uom": "",
//   "masterPackQty": null,
//   "innerPackQty": null,

//   "dimensions": {
//     "caseLength": null,
//     "caseWidth": null,
//     "caseHeight": null,
//     "caseWeight": null,
//     "productLength": "12.0000",
//     "productWidth": "3.0000",
//     "productHeight": "12.0000",
//     "productWeight": null
//   },

//   "customFields": {
//     "custom1": "",
//     "custom2": "",
//     "custom3": "",
//     "custom4": "01/14/2025_NA_0_NA",
//     "custom5": "Laz_Main, SPH_Main, JG_Website, Tiktok",
//     "custom6": "A7-L 17% 0% DL",
//     "custom7": "1 SPOT",
//     "custom8": "",
//     "custom9": "",
//     "custom10": ""
//   },

//   "isSellable": true,
//   "isPurchaseable": true,
//   "isActive": true,
//   "trackSerials": false,

//   "dateIntroduced": "2026-06-22T11:28:26.997",
//   "dateUpdated": null,

//   "lastModifiedById": "100",
//   "lastModifiedDttm": "2026-06-22T17:04:39.817",
//   "timestamp": null,

//   "pictureFileAttachmentId": null,

//   "salesUom": {
//     "name": "",
//     "ratioStd": "1.0000",
//     "ratio": "1.0000"
//   },

//   "purchaseUom": {
//     "name": "",
//     "ratioStd": "1.0000",
//     "ratio": "1.0000"
//   },

//   "category": {
//     "categoryId": "101",
//     "name": "Sample Category",
//     "description": "",
//     "isActive": true
//   },

//   "lastModifiedBy": {
//     "teamMemberId": "100",
//     "name": "Default User",
//     "isInternal": false
//   },

//   "attachments": [],
//   "prices": [],
//   "taxCodes": [],
//   "balances": []
// }


// {
//     "version": 2,
//     "itemType": 1,
//     "name": "ACCSOON AA-01",
//     "description": "Accsoon AA-01 Aluminum 1/4\" Adjustable Cold Shoe Mount Adapter for Videography & Photography Camera Accessories, Video Light, Microphone, Field Display Monitor, Phone Holder",
//     "remarks": "",
//     "barCode": "664918771676",
//     "categoryId": 103,
//     "defaultLocationId": null,
//     "defaultSublocation": "",
//     "reorderPoint": "25.0000",
//     "reorderQuantity": "25.0000",
//     "uom": "",
//     "masterPackQty": null,
//     "innerPackQty": null,
//     "caseLength": null,
//     "caseWidth": null,
//     "caseHeight": null,
//     "caseWeight": null,
//     "productLength": "7.0000",
//     "productWidth": "4.0000",
//     "productHeight": "10.0000",
//     "productWeight": null,
//     "custom1": "",
//     "custom2": "",
//     "custom3": "",
//     "custom4": "01/05/2024_MOVING_19_NA",
//     "custom5": "Laz_Main, Laz_Pro, SPH_Main, JG_Website, Tiktok",
//     "lastVendorId": 102,
//     "isSellable": 1,
//     "isPurchaseable": 1,
//     "dateIntroduced": "2026-06-22 11:50:18.140000",
//     "dateUpdated": null,
//     "lastModUserId": 100,
//     "lastModDttm": "2026-06-22 13:08:10.737000",
//     "timestamp": "00000002486d3918",
//     "isActive": 1,
//     "custom6": "A60-O 17% 12% DT",
//     "custom7": "ACCSOON",
//     "custom8": "",
//     "custom9": "",
//     "custom10": "",
//     "pictureFileAttachmentId": null,
//     "soUomName": "",
//     "soUomRatioStd": "1.0000",
//     "soUomRatio": "1.0000",
//     "poUomName": "",
//     "poUomRatioStd": "1.0000",
//     "poUomRatio": "1.0000",
//     "prodId": 103,
//     "trackSerials": 1,
//     "syncedAt": "2026-07-11 13:12:17"
//   },