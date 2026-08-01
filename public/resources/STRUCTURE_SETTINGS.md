Settings
├── General
├── Financial
│   ├── Pricing Schemes
│   ├── Taxing Schemes
│   ├── Currencies
│   └── Payment Terms
├── Inventory
│   └── Adjustment Reasons
├── Database
├── Sync
├── Payment
├── Tax Configuration
└── Trash

```

Keep in the main navigation

These are operational modules and should remain easily accessible.

Dashboard
POS
Customer Orders
Fulfillments
Products
Groups
Categories
Brands
Tags
Attributes
UOMs
Inventory
Transfer Orders
Business Partners

```

Suggested final navigation

Dashboard

Sales
├── POS
├── Customer Orders
└── Fulfillments

Catalog
├── Products
├── Groups
├── Categories
├── Brands
├── Tags
└── Attributes

Inventory
├── Inventory
└── Transfer Orders

CRM
└── Business Partners

Reports
├── Analytics
└── Reports

Administration
├── ETL
└── Settings
    ├── General
    ├── Locations
    ├── Users
    ├── Team Members
    ├── Pricing Schemes
    ├── Taxing Schemes
    ├── Payment Terms
    ├── Currencies
    ├── UOMs (optional)
    ├── Adjustment Reasons
    ├── Payment
    ├── Tax Configuration
    ├── Database
    ├── Sync
    └── Trash


## Option 1: One Next.js app (Recommended)
app/
├── (public)/
│   ├── page.tsx                 // Landing page
│   ├── catalog/
│   ├── products/
│   ├── categories/
│   └── store/
│
├── (auth)/
│   ├── login/
│   └── register/
│
├── dashboard/
│   ├── ...
│   └── settings/
│
└── api/

## Public Routes

/
 /catalog
 /products
 /products/[slug]
 /categories
 /brands

--- 

 app/
│
├── (public)
│   ├── page.tsx
│   ├── catalog/
│   ├── collections/
│   ├── categories/
│   ├── brands/
│   ├── products/[slug]/
│   ├── cart/
│   └── checkout/
│
├── (auth)
│   ├── login/
│   └── register/
│
├── dashboard/
│   ├── products/
│   ├── inventory/
│   ├── customers/
│   ├── orders/
│   ├── analytics/
│   └── settings/
│
├── api/
└── middleware.ts