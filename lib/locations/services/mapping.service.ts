// lib/locations/services/webhook-taxing-scheme.service.ts
import { prisma } from "@/lib/prisma";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { WebhookService } from "@/services/webhook.service";

export interface SyncResult {
  success: boolean;
  message?: string;
  inflowPayload?: any; // Matches your STEP 5 schema
}

export class MappingWebhookService {

  static async handleCategoryMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for category ID: ${inflowId}`);
    
    const result = await prisma.categoryLocationMap.upsert({
      where: {
        categoryId_locationId: {
          categoryId: inflowId, 
          locationId: locationId,   
        }
      },
      update: {
        localId: Number(localId)            
      },
      create: {
        categoryId: inflowId,
        locationId: locationId,
        localId: Number(localId)
      }
    });

    if (result && eventId) {
      await prisma.locationWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });

      return { success: true };
    }

    return { success: false };
  }

  static async handleLocationMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for taxing code ID: ${inflowId}`);
    
    const result = await prisma.taxCodeLocationMap.upsert({
      where: {
        taxCodeId_locationId: {
          taxCodeId: inflowId, 
          locationId: locationId,   
        }
      },
      update: {
        localId: Number(localId)            
      },
      create: {
        taxCodeId: inflowId,
        locationId: locationId,
        localId: Number(localId)
      }
    });

    if (result && eventId) {
      await prisma.locationWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });

      return { success: true };
    }

    return { success: false };
  }

  static async handleTaxingSchemeMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for taxing scheme ID: ${inflowId}`);
    
    const result = await prisma.taxingSchemeLocationMap.upsert({
      where: {
        taxingSchemeId_locationId: {
          taxingSchemeId: inflowId, 
          locationId: locationId,   
        }
      },
      update: {
        localId: Number(localId)            
      },
      create: {
        taxingSchemeId: inflowId,
        locationId: locationId,
        localId: Number(localId)
      }
    });

    if (result && eventId) {
      await prisma.locationWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });

      return { success: true };
    }

    return { success: false };
  }

  // static async handleCurrencyMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
  //   console.log(`[Webhook Service] Processing real-time update for taxing scheme ID: ${inflowId}`);
    
  //   const result = await prisma.currencyLocationMap.upsert({
  //     where: {
  //       currencyId_locationId: {
  //         currencyId: inflowId, 
  //         locationId: locationId,    
  //       }
  //     },
  //     update: {
  //       localId: Number(localId)   
  //     },
  //     create: {
  //       currencyId: inflowId,
  //       locationId: locationId,
  //       localId: Number(localId)
  //     }
  //   });

  //   if (result && eventId) {
  //     await prisma.locationWebhookEvent.update({
  //       where: { id: eventId },
  //       data: { processed: true }
  //     });

  //     return { success: true };
  //   }

  //   return { success: false };
  // }

  // static async handlePricingSchemeMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
  //   console.log(`[Webhook Service] Processing real-time update for Pricing Scheme ID: ${inflowId}`);
    
  //   const result = await prisma.pricingSchemeLocationMap.upsert({
  //     where: {
  //       pricingSchemeId_locationId: {
  //         pricingSchemeId: inflowId, 
  //         locationId: locationId,    
  //       }
  //     },
  //     update: {
  //       localId: Number(localId)   
  //     },
  //     create: {
  //       pricingSchemeId: inflowId,
  //       locationId: locationId,
  //       localId: Number(localId)
  //     }
  //   });

  //   if (result && eventId) {
  //     await prisma.locationWebhookEvent.update({
  //       where: { id: eventId },
  //       data: { processed: true }
  //     });

  //     return { success: true };
  //   }

  //   return { success: false };
  // }

  static async handleCustomerMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for customer ID: ${inflowId}`);
    
    const result = await prisma.customerLocationMap.upsert({
      where: {
        customerId_locationId: {
          customerId: inflowId, 
          locationId: locationId,    
        }
      },
      update: {
        localId: Number(localId)    
      },
      create: {
        customerId: inflowId,
        locationId: locationId,
        localId: Number(localId)
      }
    });

    if (result && eventId) {
      await prisma.locationWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });

      return { success: true };
    }

    return { success: false };
  }

  static async handleProductMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for product ID: ${inflowId}`);
    
    const result = await prisma.productLocationMap.upsert({
      where: {
        productId_locationId: {
          productId: inflowId, 
          locationId: locationId,    
        }
      },
      update: {
        localId: Number(localId)    
      },
      create: {
        productId: inflowId,
        locationId: locationId,
        localId: Number(localId)
      },
      select: { 
        product: { select: { name: true, images: true }},
        location: { select: { inflowId: true, name: true, url: true }},
       }
    });

    if (result && eventId) {
      await prisma.locationWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });
    }


    if (result.location && result.product && result.product.images?.[0]?.originalUrl) {
      const currentImageUrl = result.product.images[0].originalUrl;
      
      const validWebhooks = await WebhookService.getLocationWebhookURLByLocationID(
        locationId, 
        "productLocal"
      );
      
      if (validWebhooks.length > 0) {
        const existingImageMaps = await prisma.productImageLocationMap.findMany({
          where: { productImageId: result.product.images[0].inflowId },
          select: { productImageId: true, locationId: true, localId: true, imageUrl: true }
        });

        // Use reduce to filter out unchanged URLs and build valid payloads cleanly
        const jobsToQueue = validWebhooks
          .filter(webhook => webhook.location?.url?.trim())
          .reduce((acc: any[], webhook) => {
            const match = existingImageMaps.find(m => m.locationId === webhook.locationId);

            // 🛑 SKIP: If the image URL is identical to what's already saved locally
            if (match?.imageUrl === currentImageUrl) {
              console.log("Skip Image", currentImageUrl);
              return acc; 
            }

            // Push valid update or insert jobs to the accumulator array
            acc.push({
              name: "image_localsync_job",
              data: {
                source: "PRODUCT_IMAGE_UPSERT_LOCAL",
                model: "ProductImage",
                payload: {
                  productId: localId,
                  name: result.product.name,
                  imageUrl: currentImageUrl,
                  productImageId: result.product.images[0].inflowId,
                  localId: match?.localId || null,
                },
                timestamp: new Date().toISOString(),
                location: {
                  inflowId: webhook.locationId,
                  url: webhook.location.url,
                  name: webhook.location.name
                }
              },
              opts: { 
                attempts: 3, 
                backoff: { type: "exponential", delay: 2000 },
                removeOnComplete: true
              }
            });

            return acc;
          }, []);

        // Now safely verified to contain only non-empty, actionable sync jobs
        if (jobsToQueue.length > 0) {
          await getMidSyncQueue().addBulk(jobsToQueue);
        }
      }

      return { success: true };
    }

    return { success: false };
  }

  static async handleProductImageMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for product image ID: ${inflowId}`);

    const productImage = await prisma.productImage.findUnique({ where: { inflowId }, select: { originalUrl: true }});

    if(!productImage) return { success: false };
    
    const result = await prisma.productImageLocationMap.upsert({
      where: {
        productImageId_locationId: {
          productImageId: inflowId, 
          locationId: locationId,  
        }
      },
      update: {
        localId: Number(localId)    
      },
      create: {
        productImageId: inflowId,
        locationId: locationId,
        localId: Number(localId),
        imageUrl: productImage.originalUrl || null
      }
    });

    if (result && eventId) {
      await prisma.locationWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });

      return { success: true };
    }

    return { success: false };
  }

  

  
}

