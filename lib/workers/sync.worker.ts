// workers/product.worker.ts

import { Job, Worker } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";

import { TestSyncService } from "@/lib/inflow/services/test-sync.service"
import { CustomerSyncService } from "@/lib/inflow/services/customer-sync.service";
import { InventorySyncService } from "@/lib/inflow/services/inventory-sync.service";
import { LocationSyncService } from "@/lib/inflow/services/location-sync.service";
import { CategorySyncService } from "../inflow/services/category-sync.service";
import { TeamMemberSyncService } from "../inflow/services/team-members-sync.service";
import { TaxingSchemeSyncService } from "../inflow/services/taxing-scheme-sync.service";
import { CurrencySyncService } from "../inflow/services/currency-sync.service";
import { AdjustmentReasonSyncService } from "../inflow/services/adjustment-sync.service";
import { PricingSchemeSyncService } from "../inflow/services/pricing-scheme-sync.service";
import { ProductCostAdjustmentSyncService } from "../inflow/services/product-cost-adjustment-sync.service";
import { PaymentTermSyncService } from "../inflow/services/payment-term-sync.service";
import { VendorSyncService } from "../inflow/services/vendor-sync.service";
import { ProductSyncService } from "@/lib/inflow/services/product-sync.service";
import { ProductBarcodeSyncService } from "../inflow/services/produc-barcode-sync.service";
import { ProductImageSyncService } from "../inflow/services/product-image-sync.service";
import { ProductTaxCodeSyncService } from "../inflow/services/product-tax-code-sync.service";
import { ProductReorderSettingSyncService } from "../inflow/services/product-reorder-setting-sync.service";
import { ProductOperationSyncService } from "../inflow/services/product-operation-sync.service";
import { ProductPriceSyncService } from "../inflow/services/product-price-sync.service";
import { ProductItemBomSyncService } from "../inflow/services/product-item-bom-sync.service";
import { ProductAttachmentSyncService } from "../inflow/services/product-attachment-sync.service";
import { ProductGroupSyncService } from "../inflow/services/product-group-sync.service";
import { ProductVariantSyncService } from "../inflow/services/product-variant-sync.service";
import { ProductGroupImageSyncService } from "../inflow/services/product-group-image-sync.service";
import { SalesOrderSyncService } from "../inflow/services/sales-order-sync.service";
import { PurchaseOrderSyncService } from "../inflow/services/purchase-order-sync.service";

// Local Imports
import { CategorySyncMapService as LocalCategorySyncMapService } from "../locations/services/category-sync-map.service";
import { CurrencySyncMapService as LocalCurrencySyncMapService } from "../locations/services/currency-sync-map.service";
import { PaymentTermSyncMapService as LocalPaymentTermSyncMapService } from "../locations/services/payment-term-sync-map.service";
import { PricingSchemeSyncMapService as LocalPricingSchemeSyncMapService } from "../locations/services/pricing-scheme-sync-map.service";
import { TaxingSchemeSyncMapService as LocalTaxingSchemeSyncMapService } from "../locations/services/taxing-scheme-sync-map.service";
import { CustomerSyncMapService as LocalCustomerSyncMapService } from "../locations/services/customer-sync-map.service";

const testService = new TestSyncService();
const categoryService = new CategorySyncService();

const productGroupService = new ProductGroupSyncService();
const productGroupImageService = new ProductGroupImageSyncService();
const productVariantService = new ProductVariantSyncService();

const productService = new ProductSyncService();
const productImageService = new ProductImageSyncService();
const productBarcodeService = new ProductBarcodeSyncService();
const productTaxService = new ProductTaxCodeSyncService();
const productReorderService = new ProductReorderSettingSyncService();
const productOperationService = new ProductOperationSyncService();
const productPriceService = new ProductPriceSyncService();
const productBomService = new ProductItemBomSyncService();
const productAttachmentService = new ProductAttachmentSyncService();

const customerService = new CustomerSyncService();
const vendorService = new VendorSyncService();
const inventoryService = new InventorySyncService();
const locationService = new LocationSyncService();
const teamMemberService = new TeamMemberSyncService();
const taxingSchemeService = new TaxingSchemeSyncService();
const currencyService = new CurrencySyncService();
const adjustmentReasonService = new AdjustmentReasonSyncService();
const pricingSchemeService = new PricingSchemeSyncService();
const productCostAdjustmentService = new ProductCostAdjustmentSyncService();
const paymentTermService = new PaymentTermSyncService();

const salesOrderService = new SalesOrderSyncService();
const purchaseOrderService = new PurchaseOrderSyncService();

// Local Service 
const categoryServiceLocal = new LocalCategorySyncMapService();
const currencyServiceLocal = new LocalCurrencySyncMapService();
const paymentServiceLocal = new LocalPaymentTermSyncMapService();
const pricingServiceLocal = new LocalPricingSchemeSyncMapService();
const taxingSchemeServiceLocal = new LocalTaxingSchemeSyncMapService();
const customerServiceLocal = new LocalCustomerSyncMapService();

interface SyncWebhookJobData {
  jobId: string;
  source: string;
  includes: any;
  selectedRecords: any;
  location: {
    inflowId: string;
    name: string;
    url: string;
  };
}

type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
};

const worker = new Worker<SyncWebhookJobData>(
  "sync",
  async (job: Job<SyncWebhookJobData>) => {
    const { jobId, source, includes, location, selectedRecords } = job.data;

    const locationUrl = (location?.url && location.url.trim() !== "") ? location.url : null;

    console.log(`[Sync Worker] Processing job source: ${source} for location ${location?.name || "cloud"}`);
    
    const syncOptions: SyncOptions = {
      onProgress: async (progress) => {
        await job.updateProgress(progress);

        await prisma.syncJob.update({
          where: { id: jobId },
          data: { progress },
        });

        // console.log(`  Progress: ${progress}%`);
      },
    };

    try {
      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: "processing",
          progress: 0,
        },
      });

      let result;

      switch (source) {
        // Local Sync
        case "categories_local":
          if (!locationUrl) {
            throw new Error(`Cannot sync category: No location URL found for location ${location?.name}`);
          }
          result = await categoryServiceLocal.sync(location, syncOptions, selectedRecords);
          break;
        case "currencies_local":
          if (!locationUrl) {
            throw new Error(`Cannot sync currency: No location URL found for location ${location?.name}`);
          }
          result = await currencyServiceLocal.sync(location, syncOptions, selectedRecords);
          break;
        case "payment_terms_local":
          if (!locationUrl) {
            throw new Error(`Cannot sync payment term: No location URL found for location ${location?.name}`);
          }
          result = await paymentServiceLocal.sync(location, syncOptions, selectedRecords);
          break;
        case "pricing_schemes_local":
          if (!locationUrl) {
            throw new Error(`Cannot sync pricing scheme: No location URL found for location ${location?.name}`);
          }
          result = await pricingServiceLocal.sync(location, syncOptions, selectedRecords);
          break;
        case "taxing_schemes_local":
          if (!locationUrl) {
            throw new Error(`Cannot sync taxing scheme: No location URL found for location ${location?.name}`);
          }
          result = await taxingSchemeServiceLocal.sync(location, syncOptions, selectedRecords);
          break;
        case "customers_local":
          if (!locationUrl) {
            throw new Error(`Cannot sync customer: No location URL found for location ${location?.name}`);
          }
          result = await customerServiceLocal.sync(location, syncOptions, selectedRecords);
          break;

        // Cloud Sync
        case "categories":
          result = await categoryService.sync(syncOptions);
          break;
        case "product_groups":
          result = await productGroupService.sync(syncOptions, includes);
          break;
        // case "product_group_images":
        //   result = await productGroupImageService.sync(syncOptions);
        //   break;
        // case "product_variants":
        //   result = await productVariantService.sync(syncOptions);
        //   break;
        case "products":
          result = await productService.sync(syncOptions, includes);
          break;
        // case "product_images":
        //   result = await productImageService.sync(syncOptions);
        //   break;
        // case "product_barcodes":
        //   result = await productBarcodeService.sync(syncOptions);
        //   break;
        // case "product_taxes":
        //   result = await productTaxService.sync(syncOptions);
        //   break;
        // case "product_reorder_settings":
        //   result = await productReorderService.sync(syncOptions);
        //   break;
        // case "product_operations":
        //   result = await productOperationService.sync(syncOptions);
        //   break;
        // case "product_prices":
        //   result = await productPriceService.sync(syncOptions);
        //   break;
        case "product_boms":
          result = await productService.sync(syncOptions, ["itemBoms"]);
          break;
        // case "product_attachments":
        //   result = await productAttachmentService.sync(syncOptions);
        //   break;
        case "customers":
          result = await customerService.sync(syncOptions);
          break;
        case "vendors":
          result = await vendorService.sync(syncOptions, includes);
          break;          
        case "inventory":
          result = await inventoryService.sync(syncOptions, includes);
          break;
        case "single_inventory":
          result = await inventoryService.syncSingle(syncOptions, includes);
          break;
        case "locations":
          result = await locationService.sync(syncOptions);
          break;
        case "team_members":
          result = await teamMemberService.sync(syncOptions);
          break;
        case "taxing_schemes":
          result = await taxingSchemeService.sync(syncOptions);
          break;
        case "currencies":
          result = await currencyService.sync(syncOptions);
          break;
        case "pricing_schemes":
          result = await pricingSchemeService.sync(syncOptions);
          break;
        case "payment_terms":
          result = await paymentTermService.sync(syncOptions);
          break;
        case "adjustment_reasons":
          result = await adjustmentReasonService.sync(syncOptions);
          break;
        case "product_cost_adjustments":
          result = await productCostAdjustmentService.sync(syncOptions);
          break;
        case "sales_orders":
          result = await salesOrderService.sync(syncOptions);
          break;
        case "purchase_orders":
          result = await purchaseOrderService.sync(syncOptions);
          break;
        case "test":
          result = await testService.sync(source, syncOptions);
          break;
        default:
          throw new Error(
            `Unsupported sync source: ${source}`
          );
      }

      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: "completed",
          progress: 100,
          data: JSON.parse(JSON.stringify(result)),
        },
      });

      return result;
    } catch (error) {
      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Unknown error",
        },
      });

      throw error;
    }
  },
  { 
    connection,
    // Concurrency controls how many webhooks this worker processes simultaneously.
    // Webhooks are fast, so you can safely handle multiple concurrently.
    concurrency: 5 
    }
);

worker.on("completed", (job) => {
  console.log(`✓ Job ${job.id} completed and saved to database`);
});

worker.on("failed", (job, err) => {
  console.error(`✗ Job ${job?.id} failed:`, err.message);
});

worker.on("error", (error) => {
  console.error("Worker error:", error);
});

console.log("🚀 Manual Sync Worker started. Listening for 'sync' jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down worker...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
