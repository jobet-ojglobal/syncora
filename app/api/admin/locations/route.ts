// app/api/admin/locations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LocationService } from "@/services/location.service";
import { LocationType } from "@/generated/prisma/enums";

export async function GET() {
  try {
    const remappedData = await LocationService.getLocations()

    return NextResponse.json(remappedData, { status: 200 });
  } catch (error) {
    console.error("Failed to query systems facilities directory:", error);
    return NextResponse.json({ error: "Internal Logistics Database processing error." }, { status: 500 });
  }
}

/**
 * 🟢 CREATE LOGISTICS SITE WITH ATOMIC DEPENDENCIES
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, isActive, isDefault, address, locationType, sublocations, url } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Depot site name is a required field parameter." },
        { status: 400 }
      );
    }

    const computedInflowId = crypto.randomUUID().toString();

    const createdRecord = await prisma.$transaction(async (tx) => {
      // Step A: Enforce single default site rules if true
      if (isDefault) {
        await tx.location.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      // Step B: Formulate address payload conditionally
      const addressData = address
        ? {
            create: {
              address1: address.address1?.trim() || null,
              address2: address.address2?.trim() || null,
              city: address.city?.trim() || null,
              state: address.state?.trim() || null,
              country: address.country?.trim() || null,
              postalCode: address.postalCode?.trim() || null,
              remarks: address.remarks?.trim() || null
            },
          }
        : undefined;

      // Step C: Formulate sublocations payload safely
      const validSublocations = Array.isArray(sublocations)
        ? sublocations
            .filter((s: any) => s?.name?.trim())
            .map((s: any) => ({ name: s.name.trim() }))
        : [];

      const sublocationsData =
        validSublocations.length > 0
          ? { create: validSublocations }
          : undefined;

      // Step D: Insert the location record
      return tx.location.create({
        data: {
          inflowId: computedInflowId,
          name: name.trim(),
          isActive: isActive ?? true,
          isDefault: isDefault ?? false,
          url: url?.trim() || "",
          address: addressData,
          sublocations: sublocationsData,
          locationType: locationType as LocationType,
        },
        include: {
          address: true,
          sublocations: true,
        },
      });
    });

    return NextResponse.json(createdRecord, { status: 201 });
  } catch (error: any) {
    console.error("Location engine write failure:", error);
    return NextResponse.json(
      { error: "Internal Database execution infrastructure error." },
      { status: 500 }
    );
  }
}

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { name, isActive, isDefault, address, sublocations, url } = body;

//     if (!name?.trim()) {
//       return NextResponse.json({ error: "Depot site name is a required field parameter." }, { status: 400 });
//     }

//     const computedInflowId = crypto.randomUUID().toString();

//     const createdRecord = await prisma.$transaction(async (tx) => {
//       // Step A: Enforce single default site rules if true
//       if (isDefault) {
//         await tx.location.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
//       }

//       // Step B: Formulate and insert the location tree
//       return tx.location.create({
//         data: {
//           inflowId: computedInflowId,
//           name: name.trim(),
//           isActive,
//           isDefault,
//           url: url.trim(),
//           address: {
//             create: {
//               address1: address.address1?.trim() || null,
//               address2: address.address2?.trim() || null,
//               city: address.city?.trim() || null,
//               state: address.state?.trim() || null,
//               country: address.country?.trim() || null,
//               postalCode: address.postalCode?.trim() || null,
//               remarks: address.remarks?.trim() || null,
//               addressType: address.addressType?.trim() || "Warehouse",
//             }
//           },
//           sublocations: {
//             create: sublocations.map((s: any) => ({
//               name: s.name.trim()
//             }))
//           }
//         },
//         include: { address: true, sublocations: true }
//       });
//     });

//     return NextResponse.json(createdRecord, { status: 201 });
//   } catch (error: any) {
//     console.error("Location engine write failure:", error);
//     return NextResponse.json({ error: "Internal Database execution infrastructure error." }, { status: 500 });
//   }
// }

/**
 * 🟡 PATCH MODIFICATIONS AND SYNCHRONIZE MULTI-TIER RELATION ARRAYS
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { inflowId, name, isActive, locationType, isDefault, address, sublocations, url } = body;

    if (!inflowId) {
      return NextResponse.json(
        { error: "Missing required inflowId target pointer." },
        { status: 400 }
      );
    }

    const updatedData = await prisma.$transaction(async (tx) => {
      // 1. Enforce single system default location rule if selected
      if (isDefault) {
        await tx.location.updateMany({
          where: { isDefault: true, NOT: { inflowId } },
          data: { isDefault: false },
        });
      }

      // 2. Handle optional/nullable 1:1 LocationAddress row record
      if (address) {
        await tx.locationAddress.upsert({
          where: { locationId: inflowId },
          update: {
            address1: address.address1?.trim() || null,
            address2: address.address2?.trim() || null,
            city: address.city?.trim() || null,
            state: address.state?.trim() || null,
            country: address.country?.trim() || null,
            postalCode: address.postalCode?.trim() || null,
            remarks: address.remarks?.trim() || null,
          },
          create: {
            locationId: inflowId,
            address1: address.address1?.trim() || null,
            address2: address.address2?.trim() || null,
            city: address.city?.trim() || null,
            state: address.state?.trim() || null,
            country: address.country?.trim() || null,
            postalCode: address.postalCode?.trim() || null,
            remarks: address.remarks?.trim() || null,
          },
        });
      } else {
        // Remove existing address record if null/removed on front-end
        await tx.locationAddress.deleteMany({
          where: { locationId: inflowId },
        });
      }

      // 3. Reconcile sublocations safely
      const safeSublocations = Array.isArray(sublocations) ? sublocations : [];
      const retainedSublocationIds = safeSublocations
        .map((s: any) => s.id)
        .filter(Boolean);

      // Clean out removed sublocation rows safely from the database layer
      await tx.sublocation.deleteMany({
        where: {
          locationId: inflowId,
          id: { notIn: retainedSublocationIds },
        },
      });

      // 4. Update remaining entries or insert newly dynamic instances
      for (const sub of safeSublocations) {
        if (!sub?.name?.trim()) continue;

        if (sub.id) {
          await tx.sublocation.update({
            where: { id: sub.id },
            data: { name: sub.name.trim() },
          });
        } else {
          await tx.sublocation.create({
            data: { locationId: inflowId, name: sub.name.trim() },
          });
        }
      }

      // 5. Commit properties down onto the root facility entry record level
      return tx.location.update({
        where: { inflowId },
        data: {
          name: name ? name.trim() : undefined,
          isActive: isActive ?? true,
          isDefault: isDefault ?? false,
          url: url?.trim() || "",
          locationType: locationType as LocationType,
        },
        include: { address: true, sublocations: true },
      });
    });

    return NextResponse.json(updatedData, { status: 200 });
  } catch (error: any) {
    console.error("Critical logistics update runtime failure:", error);
    return NextResponse.json(
      { error: "Internal Database transaction update modification failure." },
      { status: 500 }
    );
  }
}
// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { inflowId, name, isActive, isDefault, address, sublocations, url } = body;

//     if (!inflowId) {
//       return NextResponse.json({ error: "Missing required inflowId target pointer." }, { status: 400 });
//     }

//     const updatedData = await prisma.$transaction(async (tx) => {
//       // 1. Enforce single system default location rule if selected
//       if (isDefault) {
//         await tx.location.updateMany({
//           where: { isDefault: true, NOT: { inflowId } },
//           data: { isDefault: false },
//         });
//       }

//       // 2. Perform upsert on the linked 1:1 LocationAddress row record
//       await tx.locationAddress.upsert({
//         where: { locationId: inflowId },
//         update: {
//           address1: address.address1?.trim() || null,
//           address2: address.address2?.trim() || null,
//           city: address.city?.trim() || null,
//           state: address.state?.trim() || null,
//           country: address.country?.trim() || null,
//           postalCode: address.postalCode?.trim() || null,
//           remarks: address.remarks?.trim() || null,
//           addressType: address.addressType?.trim() || "Warehouse",
//         },
//         create: {
//           locationId: inflowId,
//           address1: address.address1?.trim() || null,
//           address2: address.address2?.trim() || null,
//           city: address.city?.trim() || null,
//           state: address.state?.trim() || null,
//           country: address.country?.trim() || null,
//           postalCode: address.postalCode?.trim() || null,
//           remarks: address.remarks?.trim() || null,
//           addressType: address.addressType?.trim() || "Warehouse",
//         }
//       });

//       // 3. Reconcile sublocations. Extract remaining targets to drop stale configurations.
//       const retainedSublocationIds = sublocations.map((s: any) => s.id).filter(Boolean);

//       // Clean out removed sublocations rows safely from the network database layer
//       await tx.sublocation.deleteMany({
//         where: {
//           locationId: inflowId,
//           id: { notIn: retainedSublocationIds }
//         }
//       });

//       // 4. Update remaining entries or insert newly dynamic instances
//       for (const sub of sublocations) {
//         if (sub.id) {
//           await tx.sublocation.update({
//             where: { id: sub.id },
//             data: { name: sub.name.trim() }
//           });
//         } else {
//           await tx.sublocation.create({
//             data: { locationId: inflowId, name: sub.name.trim() }
//           });
//         }
//       }

//       // 5. Commit properties down onto the root facility entry record level
//       return tx.location.update({
//         where: { inflowId },
//         data: {
//           name: name.trim(),
//           isActive,
//           isDefault,
//           url: url.trim(),
//         },
//         include: { address: true, sublocations: true }
//       });
//     });

//     return NextResponse.json(updatedData, { status: 200 });
//   } catch (error: any) {
//     console.error("Critical logistics update runtime failure:", error);
//     return NextResponse.json({ error: "Internal Database transaction update modification failure." }, { status: 500 });
//   }
// }