
craft a vendor form component with initialData props for edit vendor, and catalogs for dependencies ... model BusinessPartner {
  id              String   @id @default(cuid())
  name            String
  contactName     String?
  email           String?
  phone           String?
  fax             String?
  website         String?
  remarks         String?
  isActive        Boolean @default(true)
  customer        Customer?
  vendor          Vendor?
  addresses       BusinessPartnerAddress[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  @@index([name])

  @@map("business_partner")
}

model BusinessPartnerAddress {
  id              String @id @default(cuid())
  inflowId        String? @unique
  businessPartnerId String
  name            String?
  address1        String?
  address2        String?
  city            String?
  state           String?
  country         String?
  postalCode      String?
  remarks         String?
  addressType     AddressType? 

  businessPartner BusinessPartner @relation(fields: [businessPartnerId], references: [id], onDelete: Cascade)

  billingCustomers Customer[] @relation("CustomerBillingAddress")
  shippingCustomers Customer[] @relation("CustomerShippingAddress")

  addressVendors    Vendor[] @relation("VendorDefaultAddress")

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  @@index([businessPartnerId])

  @@map("business_partner_address")
}

enum AddressType {
  Commercial
  Residential
}   ... 
model Vendor {
  id                        String @id @default(cuid())
  businessPartnerId         String @unique
  inflowId                  String @unique
  currencyId                String?
  defaultAddressId          String?
  defaultCarrier            String?
  defaultPaymentMethod      String?
  defaultPaymentTermsId     String?
  discount                  Decimal? @db.Decimal(10,2)
  isTaxInclusivePricing     Boolean @default(false)
  leadTimeDays              Int?
  taxingSchemeId            String?
  lastModifiedById          String?
  lastModifiedDttm          DateTime?

  businessPartner BusinessPartner @relation(fields: [businessPartnerId],references: [id],onDelete: Cascade)
  currency Currency? @relation(fields: [currencyId], references: [inflowId])
  defaultPaymentTerms PaymentTerm? @relation(fields: [defaultPaymentTermsId], references: [inflowId])
  taxingScheme TaxingScheme? @relation(fields: [taxingSchemeId], references: [inflowId])
  lastModifiedBy TeamMember? @relation("VendorLastModifiedBy",fields: [lastModifiedById],references: [inflowId])

  defaultAddress BusinessPartnerAddress? @relation("VendorDefaultAddress",fields: [defaultAddressId], references: [inflowId])

  products   Product[]
  dues       VendorDue[]
  balances   VendorBalance[]
  credits    VendorCredit[]
  attachments     VendorAttachment[]
  vendorItems     VendorItem[]
  reorderSettings reorderSetting[]
  purchaseOrders        PurchaseOrder[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  deletedAt DateTime?

  @@map("vendor")
}

model VendorAttachment {
  id            String @id @default(cuid())
  inflowId      String @unique
  vendorId      String
  fileName      String?
  fileUrl       String?
  fileSize      Int?
  contentType   String?
  vendor        Vendor @relation(fields: [vendorId], references: [inflowId], onDelete: Cascade)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([vendorId])

  @@map("vendor_attachment")
}

model VendorItem {
  id            String @id @default(cuid())
  inflowId      String @unique
  vendorId      String
  productId     String
  vendorSku     String?
  unitCost      Decimal? @db.Decimal(18,5)
  vendor        Vendor @relation(fields: [vendorId], references: [inflowId], onDelete: Cascade)
  product       Product @relation(fields: [productId],references: [inflowId],onDelete: Cascade)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([vendorId, productId])

  @@index([vendorId])
  @@index([productId])

  @@map("vendor_item")
}


model VendorDue {
  id                String   @id @default(cuid())
  inflowId          String   @unique
  vendorId        String
  currencyId        String
  amountCurrent     Decimal  @db.Decimal(18,5)
  amount1To30       Decimal  @db.Decimal(18,5)
  amount31To60      Decimal  @db.Decimal(18,5)
  amount61Plus      Decimal  @db.Decimal(18,5)

  vendor            Vendor @relation(fields: [vendorId], references: [inflowId], onDelete: Cascade)
  currency          Currency @relation(fields: [currencyId], references: [inflowId])

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([vendorId])
  @@index([currencyId])

  @@unique([vendorId, currencyId])

  @@map("vendor_due")
}

model VendorBalance {
  id                String   @id @default(cuid())
  inflowId          String   @unique
  vendorId        String
  currencyId        String
  balance           Decimal  @db.Decimal(18,5)
  vendor          Vendor @relation(fields: [vendorId], references: [inflowId], onDelete: Cascade)
  currency          Currency @relation(fields: [currencyId], references: [inflowId])

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([vendorId])
  @@index([currencyId])

  @@unique([vendorId, currencyId])

  @@map("vendor_balance")
}

model VendorCredit {
  id                String   @id @default(cuid())
  inflowId          String   @unique
  vendorId        String
  currencyId        String
  credit            Decimal  @db.Decimal(18,5)
  vendor          Vendor @relation(fields: [vendorId], references: [inflowId], onDelete: Cascade)
  currency          Currency @relation(fields: [currencyId], references: [inflowId])

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([vendorId])
  @@index([currencyId])

  @@unique([vendorId, currencyId])

  @@map("vendor_credit")
}   . using next.js typescript, prisma, shadcn ui, zod validation, import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"; import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";  .. 