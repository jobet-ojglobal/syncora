// app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CategoryService } from "@/services/category.service";
import { WebhookService } from "@/services/webhook.service";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { prisma } from "@/lib/prisma";

// =====================================================
// GET ALL CATEGORIES
// =====================================================

export async function GET() {
  try {
    const catalogData =
      await CategoryService.getCategories();

    const formattedData = catalogData.map(cat => ({
      id: cat.id,
      inflowId: cat.inflowId,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      imageUrl: cat.imageUrl,
      parentId: cat.parentId,
      productsCount: cat._count.products,
      subcategoriesCount: cat._count.children,
    }));

    return NextResponse.json(formattedData, { status: 200 });
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Failed to fetch categoriesr" }, { status: 500 });
  }
}

// =====================================================
// CREATE CATEGORY
// =====================================================

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    const { name, description, imageUrl, parentId } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is a required payload token" }, { status: 400 });
    }

    // 1. Fetch current database record to check if name changed
    const existing = await CategoryService.nameConflictCheck(name, null);
    if (existing) {
      return NextResponse.json({ error: `A category profile titled "${name.trim()}" already exists.` }, { status: 409 });
    }

    const parentCategory = parentId == 'root-level' ? null : parentId;

    const newCategory =
      await CategoryService.createCategory({
        name, description, imageUrl, parentId: parentCategory ,
      });

    // Re-map structural fields targeting Cloud Global Identifiers
    const inflowPayload = {
      cloudId: newCategory.inflowId,
      name: newCategory.name,
      parentId: newCategory.parentId
    };
    
        
    if (!newCategory || !inflowPayload) {
      return NextResponse.json({ error: "Failed to assemble category scheme components." }, { status: 500 });
    }
    
    const { cloudId, ...cleanInflowPayload } = inflowPayload;

    const validWebhooks = await WebhookService.getLocationWebhookURLs("categoryLocal");

    const existingParentMappings = await prisma.categoryLocationMap.findMany({
      where: { categoryId: cleanInflowPayload.parentId || undefined },
      select: { locationId: true, localId: true }
    });
    
    if (validWebhooks.length > 0) {
      const jobsToQueue = validWebhooks
      .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
      .map((webhook) => {
        const matchParent = existingParentMappings.find(m => m.locationId === webhook.locationId);
        
        return {
        name: "category_localsync_job",
        data: {
          source: "CATEGORY_UPSERT_LOCAL",
          model: "Category", 
          payload: {
            ...cleanInflowPayload,
            categoryId: cloudId, 
            localId: null,
            parentCategoryId: matchParent?.localId || null
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
      }});

      await getMidSyncQueue().addBulk(jobsToQueue);
      console.log(`[Queue] Successfully broadcasted sync jobs to ${jobsToQueue.length} locations.`);
    }

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error("Critical failure during Category transaction writes:", error);
    return NextResponse.json({ error: "Internal Database Execution Error" }, { status: 500 });
  }
}

// =====================================================
// UPDATE CATEGORY
// =====================================================

export async function PATCH(
  request: NextRequest
) {
  try {
    const body = await request.json();
    const { id, name, description, imageUrl, parentId } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required id target pointer token" }, { status: 400 });
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: "Category workspace name cannot be left empty" }, { status: 400 });
    }

    // 1. Fetch current database record to check if name changed
    const currentCategory = await CategoryService.getBasicCategory(id);
    if (!currentCategory) {
      return NextResponse.json({ error: "Category not found in local system records" }, { status: 400 });
    }

    const conflictCheck = await CategoryService.nameConflictCheck(name, id);
    if (conflictCheck) {
      return NextResponse.json({ error: `Naming label "${name.trim()}" is already claimed by another active profile.` }, { status: 409 });
    }

    const parentCategory = parentId == 'root-level' ? null : parentId;

    const updatedCategory = await CategoryService.updateCategory({
      id, name, description, imageUrl, parentId: parentCategory,
    });

    // Re-map structural fields targeting Cloud Global Identifiers
    const inflowPayload = {
      cloudId: updatedCategory.inflowId,
      name: updatedCategory.name,
      parentId: updatedCategory.parentId
    };
    
        
    if (!updatedCategory || !inflowPayload) {
      return NextResponse.json({ error: "Failed to assemble category scheme components." }, { status: 500 });
    }
    
    const { cloudId, ...cleanInflowPayload } = inflowPayload;

    const validWebhooks = await WebhookService.getLocationWebhookURLs("categoryLocal");

    const existingMappings = await prisma.categoryLocationMap.findMany({
      where: { categoryId: cloudId },
      select: { locationId: true, localId: true }
    });

    const existingParentMappings = await prisma.categoryLocationMap.findMany({
      where: { categoryId: cleanInflowPayload.parentId || undefined },
      select: { locationId: true, localId: true }
    });
    
    if (validWebhooks.length > 0) {
      const jobsToQueue = validWebhooks
      .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
      .map((webhook) => {
        const match = existingMappings.find(m => m.locationId === webhook.locationId);
        const matchParent = existingParentMappings.find(m => m.locationId === webhook.locationId);
        
        return {
        name: "category_localsync_job",
        data: {
          source: "CATEGORY_UPSERT_LOCAL",
          model: "Category", 
          payload: {
            ...cleanInflowPayload,
            categoryId: cloudId, 
            localId: match?.localId || null,
            parentCategoryId: matchParent?.localId || null
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
      }});

      await getMidSyncQueue().addBulk(jobsToQueue);
      console.log(`[Queue] Successfully broadcasted sync jobs to ${jobsToQueue.length} locations.`);
    }


    return NextResponse.json(updatedCategory, { status: 200 });
  } catch (error: any) {
    console.error("Critical failure during Category model update writes:", error);
    return NextResponse.json({ error: "Internal Database execution update error occurred" }, { status: 500 });
  }
}

