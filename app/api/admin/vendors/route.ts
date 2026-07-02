// app/api/admin/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { midSyncQueue } from "@/lib/queues/sync.queue";
import { Prisma } from "@/generated/prisma/client";
import { vendorFormSchema } from "@/schemas/vendor.schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { 
      name, contactName, email, phone, fax, website, remarks, isActive, 
       defaultCarrier, defaultPaymentMethod, discount, defaultPaymentTermsId, taxingSchemeId, currencyId, addresses = []
    } = vendorFormSchema.parse(body);
   
   // Form clean native GUIDs to ensure 100% downstream compliance with inFlow's database schema
    const vendorId = crypto.randomUUID().toLowerCase();
    const cleanEmail = email?.trim().toLowerCase() || null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Parent Business Partner Node
      const businessPartner = await tx.businessPartner.create({
        data: { 
          name: name.trim(), 
          contactName: contactName?.trim(), 
          email: cleanEmail, 
          phone: phone?.trim(), 
          fax: fax?.trim(), 
          website: website?.trim(), 
          remarks: remarks?.trim(), 
          isActive: isActive ?? true 
        }
      });

      // 2. Create Related Address Vectors
      const savedAddresses = await Promise.all(
        addresses.map(async (addr: any) => {
          const addressId = crypto.randomUUID().toLowerCase(); 
          return await tx.businessPartnerAddress.create({
            data: {
              businessPartnerId: businessPartner.id,
              inflowId: addressId,
              name: addr.name?.trim() || "Primary Address",
              address1: addr.address1?.trim() || "",
              address2: addr.address2?.trim() || null,
              city: addr.city?.trim() || "",
              state: addr.state?.trim() || "",
              country: addr.country?.trim() || "Philippines",
              postalCode: addr.postalCode?.trim() || "",
              remarks: addr.remarks?.trim() || null,
              addressType: addr.addressType || "Commercial"
            }
          });
        })
      );

      // Determine explicit structural fallback selectors
      const addressIndex = addresses.findIndex((a: any) => a.isDefaultAddress === true);
      
      const addressInflowId = savedAddresses[addressIndex >= 0 ? addressIndex : 0]?.inflowId || null;

      // 3. Setup Core Customer Record Block
      const vendor = await tx.vendor.create({
        data: {
          businessPartnerId: businessPartner.id,
          inflowId: vendorId,
          defaultCarrier: defaultCarrier?.trim() || null,
          defaultPaymentMethod: defaultPaymentMethod?.trim() || null,
          discount: discount ? new Prisma.Decimal(discount) : 0,
          defaultPaymentTermsId: defaultPaymentTermsId || null,
          taxingSchemeId: taxingSchemeId || null,
          defaultAddressId: addressInflowId,
        }
      });

      // 4. Seeding Financial Summaries 

      // await Promise.all([
      //   tx.vendorBalance.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), vendorId, currencyId, balance: 0 } }),
      //   tx.vendorCredit.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), vendorId, currencyId, credit: 0 } }),
      //   tx.vendorDue.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), vendorId, currencyId, amountCurrent: 0, amount1To30: 0, amount31To60: 0, amount61Plus: 0 } })
      // ]);

      /**
       * STEP 5: Construct Outbound inFlow-Compliant Nested Payload Representation
       */
      const inflowPayload = {
        id: vendor.id,
        vendorId: vendor.inflowId,
        name: businessPartner.name,
        contactName: businessPartner.contactName,
        email: businessPartner.email,
        phone: businessPartner.phone,
        fax: businessPartner.fax,
        website: businessPartner.website,
        remarks: businessPartner.remarks,
        isActive: businessPartner.isActive,

        discount: vendor.discount ? vendor.discount.toString() : null,
        defaultCarrier: vendor.defaultCarrier,
        defaultPaymentMethod: vendor.defaultPaymentMethod,

        defaultPaymentTermsId: vendor.defaultPaymentTermsId,
        taxingSchemeId: vendor.taxingSchemeId,
        currencyId: vendor.currencyId,
        defaultAddressId: vendor.defaultAddressId,

        addresses: savedAddresses.map(addr => ({
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
        customFields: {
          custom1: null,
          custom2: null,
          custom3: null,
          custom4: null,
          custom5: null,
          custom6: null,
          custom7: null,
          custom8: null,
          custom9: null,
          custom10: null,
        }
      };

      return { vendor, inflowPayload };
    });

    // 6. Push safely to background worker queue outside the active DB transaction scope
    await midSyncQueue.add(
      "vendor_sync_job",
      {
        source: "VENDOR_SYNC_API",
        model: "VENDOR",
        payload: result.inflowPayload,
        timestamp: new Date().toISOString()
      },
      { 
        attempts: 3, 
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true
      }
    );

    return NextResponse.json(result.vendor, { status: 201 });
  } catch (error) {
    console.error("[VENDOR_POST_ERROR]:", error);
    
    return NextResponse.json({ error: "Failed to process vendor creation pipeline." }, { status: 500 });
  }
}

// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { 
//       id, name, contactName, email, phone, fax, website, remarks, isActive, 
//       taxExemptNumber, defaultCarrier, defaultPaymentMethod, discount, 
//       defaultLocationId, defaultPaymentTermsId, pricingSchemeId, taxingSchemeId, 
//       defaultSalesRepTeamMemberId, addresses = [], customFields = {}
//     } = body;

//     if (!id) {
//       return NextResponse.json({ error: "Missing required customer target identification reference token." }, { status: 400 });
//     }

//     const cleanEmail = email?.trim().toLowerCase() || null;

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Fetch current database record contexts
//       const currentCustomer = await tx.customer.findUnique({
//         where: { id },
//         select: { businessPartnerId: true, inflowId: true }
//       });
//       if (!currentCustomer) throw new Error("Target customer record layout context was not located.");

//       // 2. Modify Core Legal Baseline Info
//       const businessPartner = await tx.businessPartner.update({
//         where: { id: currentCustomer.businessPartnerId },
//         data: { 
//           name: name?.trim(), 
//           contactName: contactName?.trim(), 
//           email: cleanEmail, 
//           phone: phone?.trim(), 
//           fax: fax?.trim(), 
//           website: website?.trim(), 
//           remarks: remarks?.trim(), 
//           isActive: isActive !== undefined ? isActive : undefined
//         }
//       });

//       const existingAddresses = await tx.businessPartnerAddress.findMany({
//         where: { businessPartnerId: currentCustomer.businessPartnerId },
//         select: { id: true }
//       });

//       const incomingIds = addresses
//         .filter((a: any) => a.id) // Only get addresses that have an ID
//         .map((a: any) => a.id);

//       // 2. Identify addresses to delete (exist in DB, but not in current payload)
//       const toDelete = existingAddresses.filter(addr => !incomingIds.includes(addr.id));

//       if (toDelete.length > 0) {
//         await tx.businessPartnerAddress.deleteMany({
//           where: { id: { in: toDelete.map(a => a.id) } }
//         });
//       }

//       // 3. Smart Address Alignment Strategy (Upserts matching structural states)
//       const syncedAddresses = await Promise.all(
//         addresses.map(async (addr: any) => {
//           const baseData = {
//             name: addr.name?.trim() || "Mailing Address",
//             address1: addr.address1?.trim() || "",
//             address2: addr.address2?.trim() || null,
//             city: addr.city?.trim() || "",
//             state: addr.state?.trim() || "",
//             country: addr.country?.trim() || "Philippines",
//             postalCode: addr.postalCode?.trim() || "",
//             remarks: addr.remarks?.trim() || null,
//             addressType: addr.addressType || "Commercial"
//           };

//           if (addr.id) {
//             return await tx.businessPartnerAddress.update({
//               where: { id: addr.id },
//               data: baseData
//             });
//           } else {
//             return await tx.businessPartnerAddress.create({
//               data: {
//                 ...baseData,
//                 businessPartnerId: currentCustomer.businessPartnerId,
//                 inflowId: crypto.randomUUID().toLowerCase()
//               }
//             });
//           }
//         })
//       );

//       const billingIndex = addresses.findIndex((a: any) => a.isDefaultBilling === true);
//       const shippingIndex = addresses.findIndex((a: any) => a.isDefaultShipping === true);
      
//       const billingInflowId = syncedAddresses[billingIndex >= 0 ? billingIndex : 0]?.inflowId || null;
//       const shippingInflowId = syncedAddresses[shippingIndex >= 0 ? shippingIndex : 0]?.inflowId || null;

//       // 4. Apply Sub-ledger Rule Context Overwrites
//       const updatedCustomer = await tx.customer.update({
//         where: { id },
//         data: {
//           taxExemptNumber: taxExemptNumber?.trim() || null,
//           defaultCarrier: defaultCarrier?.trim() || null,
//           defaultPaymentMethod: defaultPaymentMethod?.trim() || null,
//           discount: discount !== undefined ? new Prisma.Decimal(discount) : undefined,
//           defaultLocationId: defaultLocationId || null,
//           defaultPaymentTermsId: defaultPaymentTermsId || null,
//           pricingSchemeId: pricingSchemeId || null,
//           taxingSchemeId: taxingSchemeId || null,
//           defaultSalesRepTeamMemberId: defaultSalesRepTeamMemberId || null,
//           defaultBillingAddressId: billingInflowId,
//           defaultShippingAddressId: shippingInflowId
//         }
//       });

//       // 5. Build up all addresses associated with this business partner for full state sync
//       const finalAddresses = await tx.businessPartnerAddress.findMany({
//         where: { businessPartnerId: currentCustomer.businessPartnerId }
//       });

//       /**
//        * STEP 5: Construct Outbound inFlow-Compliant Upsert Representation
//        */
//       const inflowPayload = {
//         customerId: currentCustomer.inflowId, // Matches immutable external inFlow GUID
//         name: businessPartner.name,
//         contactName: businessPartner.contactName,
//         email: businessPartner.email,
//         phone: businessPartner.phone,
//         fax: businessPartner.fax,
//         website: businessPartner.website,
//         remarks: businessPartner.remarks,
//         discount: updatedCustomer.discount ? updatedCustomer.discount.toString() : null,
//         isActive: businessPartner.isActive,
//         taxExemptNumber: updatedCustomer.taxExemptNumber,
//         defaultLocationId: updatedCustomer.defaultLocationId,
//         defaultCarrier: updatedCustomer.defaultCarrier,
//         defaultPaymentMethod: updatedCustomer.defaultPaymentMethod,
//         defaultPaymentTermsId: updatedCustomer.defaultPaymentTermsId,
//         pricingSchemeId: updatedCustomer.pricingSchemeId,
//         taxingSchemeId: updatedCustomer.taxingSchemeId,
//         defaultSalesRepTeamMemberId: updatedCustomer.defaultSalesRepTeamMemberId,
//         defaultBillingAddressId: updatedCustomer.defaultBillingAddressId,
//         defaultShippingAddressId: updatedCustomer.defaultShippingAddressId,
//         addresses: finalAddresses.map(addr => ({
//           customerAddressId: addr.inflowId,
//           customerId: currentCustomer.inflowId,
//           name: addr.name,
//           address: {
//             addressType: addr.addressType,
//             address1: addr.address1,
//             address2: addr.address2,
//             city: addr.city,
//             state: addr.state,
//             postalCode: addr.postalCode,
//             country: addr.country,
//             remarks: addr.remarks
//           }
//         })),
//         customFields: {
//           custom1: customFields.custom1 || null,
//           custom2: customFields.custom2 || null,
//           custom3: customFields.custom3 || null,
//           custom4: customFields.custom4 || null,
//           custom5: customFields.custom5 || null,
//           custom6: customFields.custom6 || null,
//           custom7: customFields.custom7 || null,
//           custom8: customFields.custom8 || null,
//           custom9: customFields.custom9 || null,
//           custom10: customFields.custom10 || null,
//         }
//       };

//       return { updatedCustomer, inflowPayload };
//     });

//     await midSyncQueue.add(
//       "customer_sync_job",
//       {
//         source: "CUSTOMER_SYNC_API",
//         model: "CUSTOMER",
//         payload: result.inflowPayload,
//         timestamp: new Date().toISOString()
//       },
//       { 
//         attempts: 3, 
//         backoff: { type: "exponential", delay: 2000 },
//         removeOnComplete: true
//       }
//     );

//     return NextResponse.json(result.updatedCustomer, { status: 200 });
//   } catch (error: any) {
//     console.error("[CUSTOMER_PATCH_ERROR]:", error);
//     return NextResponse.json({ error: error.message || "Internal failure modifying transactional parameters." }, { status: 500 });
//   }
// }
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { vendorFormSchema } from "@/schemas/vendor.schema";
// import z from "zod";
// import { midSyncQueue } from "@/lib/queues/sync.queue";

// export async function POST(request: NextRequest) {
//   try {
//    const body = await request.json();
    
//     // 1. Validate the incoming data against our shared Zod schema
//     const data = vendorFormSchema.parse(body);
   
//     // Form clean native GUIDs to ensure 100% downstream compliance with inFlow's database schema
//     const customerId = crypto.randomUUID().toLowerCase();
//     const cleanEmail = data.email?.trim().toLowerCase() || null;

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Create Parent Business Partner Node
//       const businessPartner = await tx.businessPartner.create({
//         data: { 
//           name: data.name.trim(), 
//           contactName: data.contactName?.trim(), 
//           email: cleanEmail, 
//           phone: data.phone?.trim(), 
//           fax: data.fax?.trim(), 
//           website: data.website?.trim(), 
//           remarks: data.remarks?.trim(), 
//           isActive: data.isActive ?? true 
//         }
//       });

//       // 2. Create Related Address Vectors
//       const savedAddresses = await Promise.all(
//         addresses.map(async (addr: any) => {
//           const addressId = crypto.randomUUID().toLowerCase(); // Native UUID string
//           return await tx.businessPartnerAddress.create({
//             data: {
//               businessPartnerId: businessPartner.id,
//               inflowId: addressId,
//               name: addr.name?.trim() || "Primary Address",
//               address1: addr.address1?.trim() || "",
//               address2: addr.address2?.trim() || null,
//               city: addr.city?.trim() || "",
//               state: addr.state?.trim() || "",
//               country: addr.country?.trim() || "Philippines",
//               postalCode: addr.postalCode?.trim() || "",
//               remarks: addr.remarks?.trim() || null,
//               addressType: addr.addressType || "Commercial"
//             }
//           });
//         })
//       );

//       // Determine explicit structural fallback selectors
//       const billingIndex = addresses.findIndex((a: any) => a.isDefaultBilling === true);
//       const shippingIndex = addresses.findIndex((a: any) => a.isDefaultShipping === true);
      
//       const billingInflowId = savedAddresses[billingIndex >= 0 ? billingIndex : 0]?.inflowId || null;
//       const shippingInflowId = savedAddresses[shippingIndex >= 0 ? shippingIndex : 0]?.inflowId || null;

//       // 3. Setup Core Customer Record Block
//       const customer = await tx.customer.create({
//         data: {
//           businessPartnerId: businessPartner.id,
//           inflowId: customerId,
//           taxExemptNumber: taxExemptNumber?.trim() || null,
//           defaultCarrier: defaultCarrier?.trim() || null,
//           defaultPaymentMethod: defaultPaymentMethod?.trim() || null,
//           discount: discount ? new Prisma.Decimal(discount) : 0,
//           defaultLocationId: defaultLocationId || null,
//           defaultPaymentTermsId: defaultPaymentTermsId || null,
//           pricingSchemeId: pricingSchemeId || null,
//           taxingSchemeId: taxingSchemeId || null,
//           defaultSalesRepTeamMemberId: defaultSalesRepTeamMemberId || null,
//           defaultBillingAddressId: billingInflowId,
//           defaultShippingAddressId: shippingInflowId
//         }
//       });

//       // 4. Seeding Financial Summaries
//       const targetPricingScheme = pricingSchemeId 
//         ? await tx.pricingScheme.findUnique({ where: { inflowId: pricingSchemeId }, select: { currencyId: true } })
//         : null;

//       const currencyId = targetPricingScheme?.currencyId || "USD";

//       await Promise.all([
//         tx.customerBalance.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, balance: 0 } }),
//         tx.customerCredit.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, credit: 0 } }),
//         tx.customerDue.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, amountCurrent: 0, amount1To30: 0, amount31To60: 0, amount61Plus: 0 } })
//       ]);

//       /**
//        * STEP 5: Construct Outbound inFlow-Compliant Nested Payload Representation
//        */
//       const inflowPayload = {
//         id: customer.id,
//         customerId: customer.inflowId,
//         name: businessPartner.name,
//         contactName: businessPartner.contactName,
//         email: businessPartner.email,
//         phone: businessPartner.phone,
//         fax: businessPartner.fax,
//         website: businessPartner.website,
//         remarks: businessPartner.remarks,
//         discount: customer.discount ? customer.discount.toString() : null,
//         isActive: businessPartner.isActive,
//         taxExemptNumber: customer.taxExemptNumber,
//         defaultLocationId: customer.defaultLocationId,
//         defaultCarrier: customer.defaultCarrier,
//         defaultPaymentMethod: customer.defaultPaymentMethod,
//         defaultPaymentTermsId: customer.defaultPaymentTermsId,
//         pricingSchemeId: customer.pricingSchemeId,
//         taxingSchemeId: customer.taxingSchemeId,
//         defaultSalesRepTeamMemberId: customer.defaultSalesRepTeamMemberId,
//         defaultBillingAddressId: customer.defaultBillingAddressId,
//         defaultShippingAddressId: customer.defaultShippingAddressId,
//         addresses: savedAddresses.map(addr => ({
//           customerAddressId: addr.inflowId,
//           customerId: customer.inflowId,
//           name: addr.name,
//           address: {
//             addressType: addr.addressType,
//             address1: addr.address1,
//             address2: addr.address2,
//             city: addr.city,
//             state: addr.state,
//             postalCode: addr.postalCode,
//             country: addr.country,
//             remarks: addr.remarks
//           }
//         })),
//         customFields: {
//           custom1: customFields.custom1 || null,
//           custom2: customFields.custom2 || null,
//           custom3: customFields.custom3 || null,
//           custom4: customFields.custom4 || null,
//           custom5: customFields.custom5 || null,
//           custom6: customFields.custom6 || null,
//           custom7: customFields.custom7 || null,
//           custom8: customFields.custom8 || null,
//           custom9: customFields.custom9 || null,
//           custom10: customFields.custom10 || null,
//         }
//       };

//       return { customer, inflowPayload };
//     });

//     // 6. Push safely to background worker queue outside the active DB transaction scope
//     // await midSyncQueue.add(
//     //   "customer_sync_job",
//     //   {
//     //     source: "CUSTOMER_SYNC_API",
//     //     model: "CUSTOMER",
//     //     payload: result.inflowPayload,
//     //     timestamp: new Date().toISOString()
//     //   },
//     //   { 
//     //     attempts: 3, 
//     //     backoff: { type: "exponential", delay: 2000 },
//     //     removeOnComplete: true
//     //   }
//     // );

//     return NextResponse.json(result.customer, { status: 201 });
//   } catch (error) {
//     console.error("Failed to create vendor:", error);

//     if (error instanceof z.ZodError) {
//       return NextResponse.json(
//         { message: "Validation failed", errors: error.flatten() },
//         { status: 400 }
//       );
//     }

//     return NextResponse.json(
//       { message: "Internal server error while creating vendor." },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
    
//     // 1. Validate the incoming data against our shared Zod schema
//     const data = vendorFormSchema.parse(body);

//     const customerId = crypto.randomUUID().toLowerCase();
//     const cleanEmail = data.email?.trim().toLowerCase() || null;

//     // 2. Perform a nested create via Prisma
//     const newVendor = await prisma.businessPartner.create({
//       data: {
//         name: data.name,
//         contactName: data.contactName,
//         email: cleanEmail,
//         phone: data.phone,
//         website: data.website,
//         remarks: data.remarks,
//         isActive: data.isActive,
        
//         // Create Nested Vendor Profile
//         vendor: {
//           create: {
//             // inflowId is strictly required in your schema. 
//             // If creating locally, we generate a unique placeholder.
//             inflowId: crypto.randomUUID().toLowerCase(),
//             currencyId: data.currencyId,
//             defaultPaymentTermsId: data.defaultPaymentTermsId,
//             taxingSchemeId: data.taxingSchemeId,
//             discount: data.discount,
//             leadTimeDays: data.leadTimeDays,
//             isTaxInclusivePricing: data.isTaxInclusivePricing,
//           },
//         },

//         // Create Nested Addresses
//         addresses: {
//           create: data.addresses.map((addr) => ({
//             name: addr.name,
//             address1: addr.address1,
//             address2: addr.address2,
//             city: addr.city,
//             state: addr.state,
//             country: addr.country,
//             postalCode: addr.postalCode,
//             addressType: addr.addressType,
//           })),
//         },
//       },
//       include: {
//         vendor: true,
//         addresses: true,
//       },
//     });

//     return NextResponse.json(newVendor, { status: 201 });

//   } catch (error) {
//     console.error("Failed to create vendor:", error);
//     return NextResponse.json(
//       { message: "Internal server error while creating vendor." },
//       { status: 500 }
//     );
//   }
// }


export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const vendorId = params.id;
    const body = await request.json();
    
    // 1. Validate incoming data
    const data = vendorFormSchema.parse(body);

    // 2. Fetch the existing vendor to ensure it exists and get its BusinessPartner ID
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { businessPartnerId: true },
    });

    if (!existingVendor) {
      return NextResponse.json({ message: "Vendor not found." }, { status: 404 });
    }

    // 3. Execute the updates inside a Prisma Transaction to ensure data integrity
    const updatedVendor = await prisma.$transaction(async (tx) => {
      
      // A. Update the BusinessPartner and Vendor records
      await tx.businessPartner.update({
        where: { id: existingVendor.businessPartnerId },
        data: {
          name: data.name,
          contactName: data.contactName,
          email: data.email,
          phone: data.phone,
          website: data.website,
          remarks: data.remarks,
          isActive: data.isActive,
          vendor: {
            update: {
              currencyId: data.currencyId,
              defaultPaymentTermsId: data.defaultPaymentTermsId,
              taxingSchemeId: data.taxingSchemeId,
              discount: data.discount,
              leadTimeDays: data.leadTimeDays,
              isTaxInclusivePricing: data.isTaxInclusivePricing,
            },
          },
        },
      });

      // B. Handle Addresses (Separate into existing, new, and deleted)
      const incomingAddressIds = data.addresses
        .map((a) => a.id)
        .filter((id): id is string => !!id);

      // Delete addresses that are no longer in the payload
      await tx.businessPartnerAddress.deleteMany({
        where: {
          businessPartnerId: existingVendor.businessPartnerId,
          id: { notIn: incomingAddressIds },
        },
      });

      // Upsert (Update existing, Create new)
      for (const address of data.addresses) {
        if (address.id) {
          // Update existing address
          await tx.businessPartnerAddress.update({
            where: { id: address.id },
            data: {
              name: address.name,
              address1: address.address1,
              address2: address.address2,
              city: address.city,
              state: address.state,
              country: address.country,
              postalCode: address.postalCode,
              addressType: address.addressType,
            },
          });
        } else {
          // Create new address
          await tx.businessPartnerAddress.create({
            data: {
              businessPartnerId: existingVendor.businessPartnerId,
              name: address.name,
              address1: address.address1,
              address2: address.address2,
              city: address.city,
              state: address.state,
              country: address.country,
              postalCode: address.postalCode,
              addressType: address.addressType,
            },
          });
        }
      }

      // C. Return the fully updated record
      return tx.vendor.findUnique({
        where: { id: vendorId },
        include: {
          businessPartner: {
            include: { addresses: true },
          },
        },
      });
    });

    return NextResponse.json(updatedVendor, { status: 200 });

  } catch (error) {
    console.error("Failed to update vendor:", error);
    return NextResponse.json(
      { message: "Internal server error while updating vendor." },
      { status: 500 }
    );
  }
}

// // app/api/admin/vendors/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { vendorFormSchema } from "@/schemas/vendor.schema";

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
    
//     // 1. Structural Validation via Zod Schema
//     const validation = vendorFormSchema.safeParse(body);
//     if (!validation.success) {
//       return NextResponse.json(
//         { error: "Validation Failure", details: validation.error.flatten() },
//         { status: 400 }
//       );
//     }

//     const data = validation.data;

//     // 2. Atomic Transaction Execution Block
//     const result = await prisma.$transaction(async (tx) => {
//       // Instantiate parent business partner record block
//       const partner = await tx.businessPartner.create({
//         data: {
//           name: data.name,
//           contactName: data.contactName || null,
//           email: data.email || null,
//           phone: data.phone || null,
//           isActive: data.isActive,
//         },
//       });

//       // Bind relational details row to vendor data ledger
//       const vendor = await tx.vendor.create({
//         data: {
//           inflowId: crypto.randomUUID().toLowerCase(),
//           businessPartnerId: partner.id,
//           currencyId: data.currencyId,
//           defaultPaymentTermsId: data.defaultPaymentTermsId,
//           taxingSchemeId: data.taxingSchemeId,
//           defaultCarrier: data.defaultCarrier || null,
//           defaultPaymentMethod: data.defaultPaymentMethod || null,
//           discount: data.discount,
//           leadTimeDays: data.leadTimeDays,
//           isTaxInclusivePricing: data.isTaxInclusivePricing,
//         },
//       });

//       return { partner, vendor };
//     });

//     return NextResponse.json({ success: true, data: result }, { status: 201 });
//   } catch (error: any) {
//     console.error("Procurement partner creation runtime fault:", error);
//     if (error.code === "P2002") {
//       return NextResponse.json(
//         { error: "Unique alignment conflict. The inflowId token is already claimed." },
//         { status: 409 }
//       );
//     }
//     return NextResponse.json(
//       { error: "Internal server breakdown executing transactional engine script." },
//       { status: 500 }
//     );
//   }
// }

// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
    
//     // 1. Structural Validation via Zod Schema
//     const validation = vendorFormSchema.safeParse(body);
//     if (!validation.success) {
//       return NextResponse.json(
//         { error: "Validation Failure", details: validation.error.flatten() },
//         { status: 400 }
//       );
//     }

//     const data = validation.data;

//     // Verify vendor existence before mutating structural blocks
//     const targetVendor = await prisma.vendor.findUnique({
//       where: { inflowId: data.inflowId },
//       select: { id: true, businessPartnerId: true },
//     });

//     if (!targetVendor) {
//       return NextResponse.json(
//         { error: "Target vendor alignment record could not be tracked." },
//         { status: 404 }
//       );
//     }

//     // 2. Atomic Transaction Modification Block
//     const result = await prisma.$transaction(async (tx) => {
//       // Modify core master details in the base partner schema block
//       const updatedPartner = await tx.businessPartner.update({
//         where: { id: targetVendor.businessPartnerId },
//         data: {
//           name: data.legalName,
//           contactName: data.contactName || null,
//           email: data.email || null,
//           phone: data.phone || null,
//           isActive: data.isActive,
//         },
//       });

//       // Sync updated configuration scalars to trade attributes extensions ledger
//       const updatedVendor = await tx.vendor.update({
//         where: { inflowId: data.inflowId },
//         data: {
//           currencyId: data.currencyId,
//           defaultPaymentTermsId: data.defaultPaymentTermsId,
//           taxingSchemeId: data.taxingSchemeId,
//           defaultCarrier: data.defaultCarrier || null,
//           defaultPaymentMethod: data.defaultPaymentMethod || null,
//           discount: data.discount,
//           leadTimeDays: data.leadTimeDays,
//           isTaxInclusivePricing: data.isTaxInclusivePricing,
//         },
//       });

//       return { updatedPartner, updatedVendor };
//     });

//     return NextResponse.json({ success: true, data: result }, { status: 200 });
//   } catch (error) {
//     console.error("Procurement partner update runtime fault:", error);
//     return NextResponse.json(
//       { error: "Internal Server database operational pipeline exception updating ledger rows." },
//       { status: 500 }
//     );
//   }
// }