// app/api/admin/customers/[id]/route.ts
import {
  NextRequest,
  NextResponse,
} from "next/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "Customer ID parameter is required." },
        { status: 400 }
      );
    }

    // 1. Fetch customer combined with its shared BusinessPartner data & addresses
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        businessPartner: {
          include: {
            addresses: true,
          },
        },
      },
    });

    if (!customer || customer.deletedAt) {
      return NextResponse.json(
        { message: "Customer record not found or has been soft-deleted." },
        { status: 404 }
      );
    }

    const { businessPartner, ...customerFields } = customer;

    // 2. Transform addresses to flag defaults matching your Zod/Form layout
    const formattedAddresses = businessPartner.addresses.map((addr: any) => ({
      id: addr.id,
      name: addr.name ?? "",
      address1: addr.address1 ?? "",
      address2: addr.address2 ?? "",
      city: addr.city ?? "",
      state: addr.state ?? "",
      country: addr.country ?? "Philippines",
      postalCode: addr.postalCode ?? "",
      addressType: addr.addressType ?? null,
      remarks: addr.remarks ?? "",
      // Compare against customer settings (via inflowId mapping)
      isDefaultBilling: addr.inflowId ? addr.inflowId === customerFields.defaultBillingAddressId : false,
      isDefaultShipping: addr.inflowId ? addr.inflowId === customerFields.defaultShippingAddressId : false,
    }));

    // 3. Normalize the final payload to strictly align with CustomerMasterInput
    const initialFormData = {
      id: customerFields.id,
      name: businessPartner.name,
      contactName: businessPartner.contactName ?? "",
      email: businessPartner.email ?? "",
      phone: businessPartner.phone ?? "",
      website: businessPartner.website ?? "",
      isActive: businessPartner.isActive,
      remarks: businessPartner.remarks ?? "",
      fax: businessPartner.fax ?? "",
      
      // Extended customer attributes
      discount: customerFields.discount ? Number(customerFields.discount) : 0, // Convert Decimal to JS Number
      taxExemptNumber: customerFields.taxExemptNumber ?? "",
      defaultCarrier: customerFields.defaultCarrier ?? "",
      defaultPaymentMethod: customerFields.defaultPaymentMethod ?? "",
      
      // Structural Relational Lookups
      defaultLocationId: customerFields.defaultLocationId ?? "",
      defaultPaymentTermsId: customerFields.defaultPaymentTermsId ?? "",
      pricingSchemeId: customerFields.pricingSchemeId ?? "",
      taxingSchemeId: customerFields.taxingSchemeId ?? "",
      defaultSalesRepTeamMemberId: customerFields.defaultSalesRepTeamMemberId ?? "",

      // Injected Sub-collection
      addresses: formattedAddresses,
    };

    return NextResponse.json(initialFormData);

  } catch (error: any) {
    console.error("[CUSTOMER_GET_ERROR]:", error);
    return NextResponse.json(
      { message: "Internal server ledger processing error." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: Props
) {
  try {
    const body = await request.json();
    const { id } = await params;
    const { isSoftDelete } = body

    if (!id) {
      return NextResponse.json({ error: "Missing required core customer profile registry identity string token tracking handle parameter." }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { inflowId: true }
    });

    if(!customer) {
      return NextResponse.json({ error: "Target customer registry record path untracked." }, { status: 404 });
    }

    // 🛡️ Preflight integrity validation check inside live sales logs databases lines
    const activePipelineCount = await prisma.salesOrder.count({ where: { customerId: customer.inflowId } });

    if (activePipelineCount > 0) {
      return NextResponse.json(
        { error: "Relational integrity lock active. Target commercial account contains active invoicing pipelines or sales orders paths links logs." },
        { status: 422 }
      );
    }

    // Execute atomic deletion operations within transactional isolation matrix block boundaries
    await prisma.$transaction(async (tx) => {
      // 1. Resolve customer structure row first to capture top level structural business partner mapping pointer keys
      const customerNode = await tx.customer.findUnique({
        where: { inflowId: customer.inflowId },
        select: { businessPartnerId: true }
      });

      if (!customerNode) throw new Error("Target customer registry record path untracked.");

      if(!isSoftDelete) {
        // await tx.customer.delete({
        //   where: { inflowId: customer.inflowId },
        // }); 

        await tx.businessPartner.delete({
          where: { id: customerNode.businessPartnerId },
        });

      } else {
        await tx.customer.update({
          where: { inflowId: customer.inflowId },
          data: { deletedAt: new Date() }
        }); 

        await tx.businessPartner.update({
          where: { id: customerNode.businessPartnerId },
          data: { 
            isActive: false,
            deletedAt: new Date()
          }
        });
      }
      
    });

    return NextResponse.json({ success: true, message: "Business Account archived safely" }, { status: 200 });
  } catch (error: any) {
    console.error("CRM Account structural archival sequence crashed:", error);
    return NextResponse.json({ error: error.message || "Internal server corporate database write transaction failed execution parameters." }, { status: 500 });
  }
}