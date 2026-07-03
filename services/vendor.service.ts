import { prisma } from "@/lib/prisma";
import { midSyncQueue } from "@/lib/queues/sync.queue";
import { Prisma } from "@/generated/prisma/client";
import { VendorFormData } from "@/schemas/vendor.schema";

export class VendorService {
    
  /**
   * Dispatches outbound background synchronizations to BullMQ
   */
  private static async dispatchSyncJob(payload: any) {
    await midSyncQueue.add(
      "vendor_sync_job",
      {
        source: "VENDOR_SYNC_API",
        model: "VENDOR",
        payload,
        timestamp: new Date().toISOString()
      },
      { 
        attempts: 3, 
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true
      }
    );
  }

  /**
   * Assembles an inFlow-compliant payload structural matrix
   */
  private static transformInflowPayload(vendor: any, bp: any, addresses: any[], currencyId: string) {
    return {
      id: vendor.id,
      vendorId: vendor.inflowId,
      name: bp.name,
      contactName: bp.contactName,
      email: bp.email,
      phone: bp.phone,
      fax: bp.fax,
      website: bp.website,
      remarks: bp.remarks,
      isActive: bp.isActive,
      
      discount: vendor.discount ? vendor.discount.toString() : null,
      defaultCarrier: vendor.defaultCarrier,
      defaultPaymentMethod: vendor.defaultPaymentMethod,
      defaultPaymentTermsId: vendor.defaultPaymentTermsId,
      taxingSchemeId: vendor.taxingSchemeId,
      currencyId,
      defaultAddressId: vendor.defaultAddressId,
      
      // Added new schema flags to downstream payload mapping
      isTaxInclusivePricing: vendor.isTaxInclusivePricing,
      leadTimeDays: vendor.leadTimeDays,

      addresses: addresses.map(addr => ({
        vendorAddressId: addr.inflowId,
        vendorId: vendor.inflowId,
        name: addr.name,
        address: {
          addressType: addr.addressType,
          address1: addr.address1,
          address2: addr.address2,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
          country: addr.country,
          remarks: addr.remarks
        }
      })),
      customFields: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`custom${i + 1}`, null]))
    };
  }

  /**
   * Grabs the entire database of vendors and maps them into an optimized batch queue injection
   */
  static async syncAll() {
    // 1. Extract the entire relational grid in a single query
    const vendors = await prisma.vendor.findMany({
      include: {
        businessPartner: {
          include: {
            addresses: true
          }
        }
      }
    });

    if (vendors.length === 0) return { scheduledJobs: 0 };

    // 2. Map records directly into BullMQ Bulk-compliant structural objects
    const bulkJobs = vendors.map((v) => {
      const currencyId = v.currencyId || "";
      const payload = this.transformInflowPayload(v, v.businessPartner, v.businessPartner.addresses, currencyId);

      return {
        name: "vendor_sync_job",
        data: {
          source: "VENDOR_SYNC_BULK",
          model: "VENDOR",
          payload,
          timestamp: new Date().toISOString()
        },
        opts: { 
          attempts: 3, 
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true
        }
      };
    });

    // 3. Atomically pass the entire list to Redis
    await midSyncQueue.addBulk(bulkJobs);

    return { scheduledJobs: bulkJobs.length };
  }

  /**
   * Pipeline logic to initialize an entirely new Vendor account structure
   */
  static async create(data: VendorFormData) {
    const vendorId = crypto.randomUUID().toLowerCase();
    
    // Normalizing edge cases where an empty string bypasses z.string().email()
    const cleanEmail = data.email?.trim() === "" ? null : data.email?.trim().toLowerCase() || null;
    const cleanWebsite = data.website?.trim() === "" ? null : data.website?.trim() || null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Base Business Partner Node
      const businessPartner = await tx.businessPartner.create({
        data: { 
          name: data.name.trim(), 
          contactName: data.contactName.trim(), 
          email: cleanEmail, 
          phone: data.phone.trim(), 
          fax: data.fax?.trim() || null, 
          website: cleanWebsite, 
          remarks: data.remarks?.trim() || null, 
          isActive: data.isActive
        }
      });

      // 2. Map & Create Related Addresses
      const savedAddresses = await Promise.all(
        data.addresses.map((addr) => 
          tx.businessPartnerAddress.create({
            data: {
              businessPartnerId: businessPartner.id,
              inflowId: crypto.randomUUID().toLowerCase(),
              name: addr.name.trim(),
              address1: addr.address1.trim(),
              address2: addr.address2?.trim() || null,
              city: addr.city.trim(),
              state: addr.state.trim(),
              country: addr.country.trim(),
              postalCode: addr.postalCode.trim(),
              remarks: addr.remarks?.trim() || null,
              addressType: addr.addressType || "Commercial"
            }
          })
        )
      );

      const defaultIndex = data.addresses.findIndex(a => a.isDefaultAddress);
      const targetAddressInflowId = savedAddresses[defaultIndex >= 0 ? defaultIndex : 0]?.inflowId || null;

      // 3. Create Core Vendor Ledger
      const vendor = await tx.vendor.create({
        data: {
          businessPartnerId: businessPartner.id,
          inflowId: vendorId,
          defaultCarrier: data.defaultCarrier?.trim() || null,
          defaultPaymentMethod: data.defaultPaymentMethod?.trim() || null,
          discount: data.discount ? new Prisma.Decimal(data.discount) : 0,
          currencyId: data.currencyId || null,
          defaultPaymentTermsId: data.defaultPaymentTermsId || null,
          taxingSchemeId: data.taxingSchemeId,
          defaultAddressId: targetAddressInflowId,
          isTaxInclusivePricing: data.isTaxInclusivePricing,
          leadTimeDays: data.leadTimeDays ?? 0,
        }
      });

      // 4. Seeding Financial Summaries
      await Promise.all([
        tx.vendorBalance.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), vendorId, currencyId: data.currencyId, balance: 0 } }),
        tx.vendorCredit.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), vendorId, currencyId: data.currencyId, credit: 0 } }),
        tx.vendorDue.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), vendorId, currencyId: data.currencyId, amountCurrent: 0, amount1To30: 0, amount31To60: 0, amount61Plus: 0 } })
      ]);

      return { 
        vendor, 
        payload: this.transformInflowPayload(vendor, businessPartner, savedAddresses, data.currencyId) 
      };
    });

    await this.dispatchSyncJob(result.payload);
    return result.vendor;
  }

  /**
   * Pipeline logic to mutate an existing Vendor entity graph cleanly
   */
  static async update(id: string, data: VendorFormData) {
    const cleanEmail = data.email?.trim() === "" ? null : data.email?.trim().toLowerCase() || null;
    const cleanWebsite = data.website?.trim() === "" ? null : data.website?.trim() || null;

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.vendor.findUnique({
        where: { id },
        include: { businessPartner: true }
      });

      if (!current) throw new Error("Target vendor structural footprint not found.");

      const bpId = current.businessPartnerId;
      const vendorInflowId = current.inflowId;

      // 1. Mutate Root Business Partner Record
      const businessPartner = await tx.businessPartner.update({
        where: { id: bpId },
        data: { 
          name: data.name.trim(), 
          contactName: data.contactName.trim(), 
          email: cleanEmail, 
          phone: data.phone.trim(), 
          fax: data.fax?.trim() || null, 
          website: cleanWebsite, 
          remarks: data.remarks?.trim() || null, 
          isActive: data.isActive
        }
      });

      // 2. Reconcile Addresses (Matches inflowId to preserve keys, fallbacks to index position)
      const existingAddresses = await tx.businessPartnerAddress.findMany({ where: { businessPartnerId: bpId } });
      const savedAddresses = [];
      const preservedIds: string[] = [];

      for (let i = 0; i < data.addresses.length; i++) {
        const addr = data.addresses[i];
        const matched = existingAddresses.find(ea => ea.inflowId === addr.inflowId) || existingAddresses[i];

        if (matched) {
          const updated = await tx.businessPartnerAddress.update({
            where: { id: matched.id },
            data: {
              name: addr.name.trim(),
              address1: addr.address1.trim(),
              address2: addr.address2?.trim() || null,
              city: addr.city.trim(),
              state: addr.state.trim(),
              country: addr.country.trim(),
              postalCode: addr.postalCode.trim(),
              remarks: addr.remarks?.trim() || null,
              addressType: addr.addressType
            }
          });
          savedAddresses.push(updated);
          preservedIds.push(updated.id);
        } else {
          const created = await tx.businessPartnerAddress.create({
            data: {
              businessPartnerId: bpId,
              inflowId: addr.inflowId || crypto.randomUUID().toLowerCase(),
              name: addr.name.trim(),
              address1: addr.address1.trim(),
              address2: addr.address2?.trim() || null,
              city: addr.city.trim(),
              state: addr.state.trim(),
              country: addr.country.trim(),
              postalCode: addr.postalCode.trim(),
              remarks: addr.remarks?.trim() || null,
              addressType: addr.addressType || "Commercial"
            }
          });
          savedAddresses.push(created);
          preservedIds.push(created.id);
        }
      }

      // Drop omitted entities safely from DB
      await tx.businessPartnerAddress.deleteMany({
        where: { businessPartnerId: bpId, id: { notIn: preservedIds } }
      });

      const defaultIndex = data.addresses.findIndex(a => a.isDefaultAddress);
      const targetAddressInflowId = savedAddresses[defaultIndex >= 0 ? defaultIndex : 0]?.inflowId || null;

      // 3. Mutate Vendor Profile Layer
      const vendor = await tx.vendor.update({
        where: { id },
        data: {
          defaultCarrier: data.defaultCarrier?.trim() || null,
          defaultPaymentMethod: data.defaultPaymentMethod?.trim() || null,
          discount: data.discount ? new Prisma.Decimal(data.discount) : 0,
          currencyId: data.currencyId || null,
          defaultPaymentTermsId: data.defaultPaymentTermsId || null,
          taxingSchemeId: data.taxingSchemeId,
          defaultAddressId: targetAddressInflowId,
          isTaxInclusivePricing: data.isTaxInclusivePricing,
          leadTimeDays: data.leadTimeDays ?? 0,
        }
      });

      // 4. Sync Financial Currencies
      await Promise.all([
        tx.vendorBalance.updateMany({ where: { vendorId: vendorInflowId }, data: { currencyId: data.currencyId } }),
        tx.vendorCredit.updateMany({ where: { vendorId: vendorInflowId }, data: { currencyId: data.currencyId } }),
        tx.vendorDue.updateMany({ where: { vendorId: vendorInflowId }, data: { currencyId: data.currencyId } })
      ]);

      return { 
        vendor, 
        payload: this.transformInflowPayload(vendor, businessPartner, savedAddresses, data.currencyId) 
      };
    });

    await this.dispatchSyncJob(result.payload);
    return result.vendor;
  }

  /**
   * Retrieves a paginated list of vendors with search filtering for dashboard views
   */
  static async findMany(options: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 10);
    const skip = (page - 1) * limit;

    // Build case-insensitive search parameters across main business partner metrics
    const where: Prisma.VendorWhereInput = options.search
      ? {
          businessPartner: {
            OR: [
              { name: { contains: options.search, mode: "insensitive" } },
              { contactName: { contains: options.search, mode: "insensitive" } },
              { email: { contains: options.search, mode: "insensitive" } },
            ],
          },
        }
      : {};

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          businessPartner: true,
        },
        skip,
        take: limit,
        orderBy: {
          businessPartner: {
            name: "asc",
          },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    return {
      data: vendors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetches a single vendor record and reshapes it to precisely match VendorFormData
   */
  static async findById(id: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        businessPartner: {
          include: {
            addresses: true,
          },
        },
      },
    });

    if (!vendor) return null;

    // Flatten relational structures cleanly for direct form consumption
    return {
      id: vendor.id,
      name: vendor.businessPartner.name,
      contactName: vendor.businessPartner.contactName,
      email: vendor.businessPartner.email || "",
      phone: vendor.businessPartner.phone,
      fax: vendor.businessPartner.fax || "",
      website: vendor.businessPartner.website || "",
      isActive: vendor.businessPartner.isActive,
      remarks: vendor.businessPartner.remarks || "",

      defaultCarrier: vendor.defaultCarrier || "",
      defaultPaymentMethod: vendor.defaultPaymentMethod || "",
      discount: vendor.discount ? Number(vendor.discount) : 0,
      defaultPaymentTermsId: vendor.defaultPaymentTermsId || "",
      taxingSchemeId: vendor.taxingSchemeId || "",
      isTaxInclusivePricing: vendor.isTaxInclusivePricing,
      leadTimeDays: vendor.leadTimeDays,
      currencyId: vendor.currencyId || "",

      addresses: vendor.businessPartner.addresses.map((addr) => ({
        inflowId: addr.inflowId,
        name: addr.name,
        address1: addr.address1,
        address2: addr.address2 || "",
        city: addr.city,
        state: addr.state,
        country: addr.country,
        postalCode: addr.postalCode,
        remarks: addr.remarks || "",
        addressType: addr.addressType,
        isDefaultAddress: vendor.defaultAddressId === addr.inflowId,
      })),
    };
  }

  
}