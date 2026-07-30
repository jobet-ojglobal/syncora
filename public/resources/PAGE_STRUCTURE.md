Given your schema, you're essentially building a **Warehouse Management System (WMS)** inside your ERP. I would organize the pages by workflow instead of by database tables. Most users should never interact directly with tables like `InventoryBinItem` or `InventoryLedger`; instead, they use inventory operations that update those models.

A good Next.js App Router structure would look like this:

```text
app
└── (dashboard)
    └── inventory
        ├── page.tsx                          // Inventory Dashboard
        │
        ├── locations
        │   ├── page.tsx                      // All warehouse locations
        │   ├── create
        │   │   └── page.tsx
        │   └── [id]
        │       ├── page.tsx                  // Location overview
        │       ├── edit
        │       │   └── page.tsx
        │       ├── address
        │       │   └── page.tsx
        │       ├── sublocations
        │       │   ├── page.tsx
        │       │   ├── create
        │       │   │   └── page.tsx
        │       │   └── [subId]
        │       │       ├── page.tsx
        │       │       └── edit
        │       │           └── page.tsx
        │       └── inventory
        │           └── page.tsx
        │
        ├── stocks
        │   ├── page.tsx                      // Current inventory
        │   ├── low-stock
        │   │   └── page.tsx
        │   ├── reorder
        │   │   └── page.tsx
        │   ├── valuation
        │   │   └── page.tsx
        │   └── [inventoryId]
        │       ├── page.tsx                  // Inventory details
        │       ├── bins
        │       │   └── page.tsx
        │       ├── serials
        │       │   └── page.tsx
        │       ├── ledger
        │       │   └── page.tsx
        │       └── edit
        │           └── page.tsx
        │
        ├── bins
        │   ├── page.tsx                      // Bin browser
        │   ├── create
        │   │   └── page.tsx
        │   └── [id]
        │       ├── page.tsx
        │       ├── items
        │       │   └── page.tsx
        │       └── move
        │           └── page.tsx
        │
        ├── serials
        │   ├── page.tsx                      // Serial lookup
        │   ├── scan
        │   │   └── page.tsx
        │   └── [serial]
        │       ├── page.tsx
        │       ├── history
        │       │   └── page.tsx
        │       └── edit
        │           └── page.tsx
        │
        ├── adjustments
        │   ├── page.tsx
        │   ├── create
        │   │   └── page.tsx
        │   ├── reasons
        │   │   ├── page.tsx
        │   │   ├── create
        │   │   │   └── page.tsx
        │   │   └── [id]
        │   │       └── edit
        │   └── [id]
        │       ├── page.tsx
        │       ├── edit
        │       │   └── page.tsx
        │       ├── post
        │       │   └── page.tsx
        │       └── print
        │           └── page.tsx
        │
        ├── transfers
        │   ├── page.tsx
        │   ├── create
        │   │   └── page.tsx
        │   └── [id]
        │       └── page.tsx
        │
        ├── ledger
        │   ├── page.tsx                      // Inventory movements
        │   ├── movements
        │   │   └── page.tsx
        │   ├── product
        │   │   └── [productId]
        │   │       └── page.tsx
        │   └── serial
        │       └── [serial]
        │           └── page.tsx
        │
        ├── reports
        │   ├── stock-on-hand
        │   │   └── page.tsx
        │   ├── stock-movement
        │   │   └── page.tsx
        │   ├── adjustment-history
        │   │   └── page.tsx
        │   ├── serial-tracking
        │   │   └── page.tsx
        │   ├── inventory-aging
        │   │   └── page.tsx
        │   └── valuation
        │       └── page.tsx
        │
        └── settings
            ├── adjustment-reasons
            │   └── page.tsx
            ├── serial-settings
            │   └── page.tsx
            └── warehouse
                └── page.tsx
```

---

# Dashboard

```
Inventory Dashboard

----------------------------------------------------------
Inventory Value        Low Stock        Pending Transfer
----------------------------------------------------------

Recent Adjustments

Recent Transfers

Stock Movement Chart

Top Moving Products

Warehouse Utilization

Quick Actions

+ Adjust Inventory
+ Receive Purchase
+ Transfer Stock
+ Search Serial
```

---

# Stocks

```
Inventory

---------------------------------------------------------
Product
SKU
Location
On Hand
Available
Reserved
Reorder
---------------------------------------------------------

Filters

Product
Category
Location
Warehouse
Low Stock
```

Clicking one inventory opens

```
Inventory Detail

Product Information

Current Quantity

Available

Reserved

Reorder Settings

Preferred Replenishment

Tabs

Overview
Bins
Serial Numbers
Ledger
History
```

---

# Locations

```
Locations

Main Warehouse

Retail Store

Outlet 1

Outlet 2

Click

Overview

Address

Sublocations

Inventory

Recent Activity
```

---

# Sublocations

```
Main Warehouse

Receiving

Rack A

Rack B

Cold Storage

Dispatch

Overflow
```

Each sublocation shows

```
Inventory Bins

Products

Capacity

Movement History
```

---

# Bins

```
Bin Browser

Rack A

A-01

A-02

A-03

Search by barcode

Click Bin

Products

Serials

Quantity

Move Stock
```

---

# Serials

```
Search Serial

SN00001234

Current Status

IN STOCK

Location

Warehouse

Bin

A-02

Movement History

Sales

Transfer

Adjustment

Purchase
```

Very useful for warranty tracking.

---

# Inventory Adjustments

```
Inventory Adjustments

Draft

Posted

Voided

Adjustment #

Reason

Created By

Date

Status
```

Open Adjustment

```
Header

Reason

Notes

Status

Performed By

Lines

Product

Location

Bin

Before

Adjusted

After

Serial Numbers

Post Adjustment
```

---

# Inventory Ledger

This becomes your audit trail.

```
Inventory Ledger

Date

Product

Location

Sublocation

Transaction

Quantity

Before

After

Reference

Performed By
```

Filters

```
Date

Product

Location

Warehouse

Transaction Type

Reference Type

Serial Number
```

---

# Reports

```
Reports

Stock on Hand

Inventory Valuation

Movement Report

Adjustment Report

Serial Tracking

Inventory Aging

Warehouse Utilization
```

---

# Recommended Services

```
services/
    inventory.service.ts

    inventory-adjustment.service.ts

    inventory-bin.service.ts

    inventory-ledger.service.ts

    serial-number.service.ts

    warehouse.service.ts

    sublocation.service.ts

    transfer.service.ts

    inventory-report.service.ts
```

---

## Recommended API Structure

```
api/

inventory/
locations/
sublocations/
bins/
serials/
adjustments/
ledger/
reports/
transfers/
```

---

## Suggested Navigation

```
Inventory
│
├── Dashboard
├── Stock
├── Locations
│     └── Sublocations
├── Bins
├── Serials
├── Transfers
├── Adjustments
├── Ledger
├── Reports
└── Settings
```

This organization scales well from a small warehouse to a multi-warehouse ERP because it mirrors how warehouse staff work: they manage stock, locations, bins, serials, transfers, and adjustments, while the `InventoryLedger` serves as the underlying audit log rather than a primary operational screen.
