import {
  // Main Navigation / Tab Icons
  LayoutDashboard,
  MonitorCheck,
  BarChart3,
  Users,
  Building2,
  FolderTree,
  Package,
  Boxes,
  Layers,
  Tags,
  Scale,
  Sliders,
  Warehouse,
  Truck,
  Percent,
  DollarSign,
  Banknote,
  CalendarDays,
  Contact2,
  Briefcase,
  ShieldAlert,
  ShoppingCart,
  ClipboardCheck,
  Database,
  FileText,
  Settings,

  // Nested / Sub-item Icons
  TrendingUp,
  MapPin,
  UserCheck,
  Box,
  Users2,
  UserPlus,
  Store,
  PlusCircle,
  Network,
  PackageCheck,
  PackagePlus,
  LayoutGrid,
  Shield,
  Tag,
  Ruler,
  ListFilter,
  Eye,
  AlertTriangle,
  XCircle,
  ArrowUpCircle,
  SlidersHorizontal,
  Camera,
  ArrowLeftRight,
  Receipt,
  Coins,
  FileClock,
  UserCog,
  ShoppingBag,
  CheckSquare,
  PackageOpen,
  Ship,
  CloudDownload,
  Terminal,
  LineChart,
  PieChart,
  Map,
  Layers3,
  Download,
  ToggleLeft,
  HardDrive,
  RefreshCw,
  CreditCard,
  Landmark,
  Trash,
} from "lucide-react";

    
export const data = {

  adminMain: [
    /* -------------------------------------------------------------------------- */
    /* CORE & SALES OPERATIONS                           */
    /* -------------------------------------------------------------------------- */
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "POS",
      url: "/dashboard/pos",
      icon: MonitorCheck,
    },
    {
      title: "Customer Orders",
      url: "/dashboard/customer-orders",
      icon: ShoppingCart,
      items: [
        {
          title: "All Orders",
          url: "/dashboard/customer-orders",
          icon: ShoppingBag,
        },
      ],
    },
    {
      title: "Fulfillments",
      url: "/dashboard/fulfillments",
      icon: ClipboardCheck,
      items: [
        {
          title: "All Fulfillments",
          url: "/dashboard/fulfillments",
          icon: CheckSquare,
        },
        {
          title: "Pickup",
          url: "/dashboard/fulfillments/pickup",
          icon: PackageOpen,
        },
        {
          title: "Delivery",
          url: "/dashboard/fulfillments/delivery",
          icon: Ship,
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /* PRODUCT & CATALOG MANAGEMENT                        */
    /* -------------------------------------------------------------------------- */
    {
      title: "Products",
      url: "/dashboard/products",
      icon: Package,
      items: [
        {
          title: "All Products",
          url: "/dashboard/products",
          icon: PackageCheck,
        },
        {
          title: "Create Product",
          url: "/dashboard/products/create",
          icon: PackagePlus,
        },
      ],
    },
    {
      title: "Groups",
      url: "/dashboard/groups",
      icon: FolderTree,
      items: [
         {
          title: "All Groups",
          url: "/dashboard/groups",
          icon: Network,
        },
        {
          title: "Create Group",
          url: "/dashboard/groups/create",
          icon: PlusCircle,
        },
      ],
    },
    {
      title: "Categories",
      url: "/dashboard/categories",
      icon: Boxes,
      items: [
        {
          title: "All Categories",
          url: "/dashboard/categories",
          icon: LayoutGrid,
        },
        {
          title: "Create Category",
          url: "/dashboard/categories/create",
          icon: PlusCircle,
        },
      ],
    },
    {
      title: "Brands",
      url: "/dashboard/brands",
      icon: Layers,
      items: [
        {
          title: "All Brands",
          url: "/dashboard/brands",
          icon: Shield,
        },
        {
          title: "Create Brand",
          url: "/dashboard/brands/create",
          icon: PlusCircle,
        },
      ],
    },
    {
      title: "Tags",
      url: "/dashboard/tags",
      icon: Tags,
      items: [
        {
          title: "All Tags",
          url: "/dashboard/tags",
          icon: Tag,
        },
        {
          title: "Create Tag",
          url: "/dashboard/tags/create",
          icon: PlusCircle,
        },
      ],
    },
    {
      title: "Attributes",
      url: "/dashboard/attributes",
      icon: Sliders,
      items: [
        {
          title: "All Attributes",
          url: "/dashboard/attributes",
          icon: ListFilter,
        },
        {
          title: "Create Attribute",
          url: "/dashboard/attributes/create",
          icon: PlusCircle,
        },
      ],
    },
    {
      title: "Uoms",
      url: "/dashboard/uoms",
      icon: Scale,
      items: [
        {
          title: "All Uoms",
          url: "/dashboard/uoms",
          icon: Ruler,
        },
        {
          title: "Create Uom",
          url: "/dashboard/uoms/create",
          icon: PlusCircle,
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /* INVENTORY & LOGISTICS                           */
    /* -------------------------------------------------------------------------- */
    {
      title: "Inventory",
      url: "/dashboard/inventory",
      icon: Warehouse,
      items: [
        {
          title: "Overview",
          url: "/dashboard/inventory",
          icon: Eye,
        },
        {
          title: "Low Stock",
          url: "/dashboard/inventory/low-stock",
          icon: AlertTriangle,
        },
        {
          title: "Out of Stock",
          url: "/dashboard/inventory/out-of-stock",
          icon: XCircle,
        },
        {
          title: "Overstocked",
          url: "/dashboard/inventory/overstocked",
          icon: ArrowUpCircle,
        },
        {
          title: "Adjustments",
          url: "/dashboard/inventory/adjustments",
          icon: SlidersHorizontal,
        },
        {
          title: "Snapshots",
          url: "/dashboard/inventory/snapshots",
          icon: Camera,
        },
      ],
    },
    {
      title: "Transfer Orders",
      url: "/dashboard/transfers",
      icon: Truck,
      items: [
        {
          title: "All Transfers",
          url: "/dashboard/transfers",
          icon: ArrowLeftRight,
        },
        {
          title: "Create Transfer",
          url: "/dashboard/transfers/create",
          icon: PlusCircle,
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /* CRM & RELATIONSHIPS                            */
    /* -------------------------------------------------------------------------- */
    {
      title: "Customer",
      url: "/dashboard/customers",
      icon: Contact2,
      items: [
        {
          title: "All Customers",
          url: "/dashboard/customers",
          icon: Users,
        },
         {
          title: "Create Customer",
          url: "/dashboard/customers/create",
          icon: UserPlus,
        },
      ],
    },
    {
      title: "Vendors",
      url: "/dashboard/vendors",
      icon: Briefcase,
      items: [
        {
          title: "All Vendors",
          url: "/dashboard/vendors",
          icon: Store,
        },
         {
          title: "Create Vendor",
          url: "/dashboard/vendors/create",
          icon: PlusCircle,
        },
      ],
    },
    {
      title: "Users",
      url: "/dashboard/users",
      icon: Users,
      items: [
        {
          title: "All Users",
          url: "/dashboard/users",
          icon: Users2,
        },
        {
          title: "Create User",
          url: "/dashboard/users/create",
          icon: UserPlus,
        },
      ],
    },
    {
      title: "Team Members",
      url: "/dashboard/team-members",
      icon: ShieldAlert,
      items: [
        {
          title: "All Members",
          url: "/dashboard/team-members",
          icon: UserCog,
        },
      ],
    },
    {
      title: "Locations",
      url: "/dashboard/locations",
      icon: Building2,
      items: [
        {
          title: "All Locations",
          url: "/dashboard/locations",
          icon: Store,
        },
        {
          title: "Create Branch",
          url: "/dashboard/locations/create",
          icon: PlusCircle,
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /* FINANCIAL SETUP                              */
    /* -------------------------------------------------------------------------- */
    {
      title: "Pricing Scheme",
      url: "/dashboard/pricing-scheme",
      icon: Banknote,
      items: [
        {
          title: "All Pricing Scheme",
          url: "/dashboard/pricing-scheme",
          icon: Tag,
        },
        {
          title: "Create Pricing Scheme",
          url: "/dashboard/pricing-scheme/create",
          icon: PlusCircle,
        },
      ],
    },
    {
      title: "Taxing Scheme",
      url: "/dashboard/taxing-scheme",
      icon: Percent,
      items: [
        {
          title: "All Taxing Scheme",
          url: "/dashboard/taxing-scheme",
          icon: Receipt,
        },
        {
          title: "Create Taxing Scheme",
          url: "/dashboard/taxing-scheme/create",
          icon: PlusCircle,
        },
      ],
    },
    {
      title: "Currency",
      url: "/dashboard/currencies",
      icon: DollarSign,
      items: [
        {
          title: "All Currency",
          url: "/dashboard/currencies",
          icon: Coins,
        },
        {
          title: "Create Currency",
          url: "/dashboard/currencies/create",
          icon: PlusCircle,
        },
      ],
    },
    {
      title: "Payment Terms",
      url: "/dashboard/payment-terms",
      icon: CalendarDays,
      items: [
        {
          title: "All Payment Terms",
          url: "/dashboard/payment-terms",
          icon: FileClock,
        },
        {
          title: "Create Payment Terms",
          url: "/dashboard/payment-terms/create",
          icon: PlusCircle,
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /* DATA, INSIGHTS & SETTINGS                          */
    /* -------------------------------------------------------------------------- */
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: BarChart3,
      items: [
        {
          title: "Sales",
          url: "/dashboard/analytics/sales",
          icon: TrendingUp,
        },
        {
          title: "Inventory",
          url: "/dashboard/analytics/inventory",
          icon: Warehouse,
        },
        {
          title: "Branches",
          url: "/dashboard/analytics/branches",
          icon: MapPin,
        },
        {
          title: "Customers",
          url: "/dashboard/analytics/customers",
          icon: UserCheck,
        },
        {
          title: "Products",
          url: "/dashboard/analytics/products",
          icon: Box,
        },
      ],
    },
    {
      title: "Reports",
      url: "/dashboard/reports",
      icon: FileText,
      items: [
        {
          title: "Sales",
          url: "/dashboard/reports/sales",
          icon: LineChart,
        },
        {
          title: "Inventory",
          url: "/dashboard/reports/inventory",
          icon: PieChart,
        },
        {
          title: "Branches",
          url: "/dashboard/reports/branches",
          icon: Map,
        },
        {
          title: "Products",
          url: "/dashboard/reports/products",
          icon: Layers3,
        },
        {
          title: "Export",
          url: "/dashboard/reports/export",
          icon: Download,
        },
      ],
    },
    {
      title: "ETL",
      url: "/dashboard/etl",
      icon: Database,
      items: [
        {
          title: "Inflow Cloud",
          url: "/dashboard/etl/inflow",
          icon: CloudDownload,
        },
        {
          title: "Logs",
          url: "/dashboard/etl/logs",
          icon: Terminal,
        },
      ],
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
      items: [
        {
          title: "General",
          url: "/dashboard/settings/general",
          icon: ToggleLeft,
        },
        {
          title: "Database",
          url: "/dashboard/settings/database",
          icon: HardDrive,
        },
        {
          title: "Sync",
          url: "/dashboard/settings/sync",
          icon: RefreshCw,
        },
        {
          title: "Payment",
          url: "/dashboard/settings/payment",
          icon: CreditCard,
        },
        {
          title: "Tax Configuration",
          url: "/dashboard/settings/tax",
          icon: Landmark,
        },
        {
          title: "Trash",
          url: "/dashboard/settings/trash",
          icon: Trash,
        },
      ],
    },
  ]
}








// ===================================================










export const breadcrumbsMap = [
  /* -------------------------------------------------------------------------- */
  /*                                   PUBLIC                                   */
  /* -------------------------------------------------------------------------- */

  {
    id: "home",
    href: "/",
    label: "Home",
  },

  {
    id: "products",
    href: "/products",
    label: "Products",
    children: [
      {
        id: "product-view",
        href: "/products/[slug]",
        label: "Overview",
      },
    ],
  },

  {
    id: "categories",
    href: "/categories",
    label: "Categories",
    children: [
      {
        id: "category-view",
        href: "/categories/[slug]",
        label: "Overview",
      },
    ],
  },

  {
    id: "brands",
    href: "/brands",
    label: "Brands",
    children: [
      {
        id: "brand-view",
        href: "/brands/[slug]",
        label: "Overview",
      },
    ],
  },

  {
    id: "tags",
    href: "/tags",
    label: "Tags",
    children: [
      {
        id: "tag-view",
        href: "/tags/[slug]",
        label: "Overview",
      },
    ],
  },

  {
    id: "cart",
    href: "/cart",
    label: "Cart",
  },

  {
    id: "checkout",
    href: "/checkout",
    label: "Checkout",
    children: [
      {
        id: "checkout-success",
        href: "/checkout/success",
        label: "Success",
      },
      {
        id: "checkout-cancel",
        href: "/checkout/cancel",
        label: "Cancel",
      },
    ],
  },

  {
    id: "branches-public",
    href: "/branches",
    label: "Branches",
    children: [
      {
        id: "branch-public-view",
        href: "/branches/[branchId]",
        label: "Overview",
      },
    ],
  },

  {
    id: "profile",
    href: "/profile",
    label: "Profile",
    children: [
      {
        id: "profile-orders",
        href: "/profile/orders",
        label: "Orders",
        children: [
          {
            id: "profile-order-view",
            href: "/profile/orders/[orderId]",
            label: "Overview",
          },
        ],
      },

      {
        id: "profile-settings",
        href: "/profile/settings",
        label: "Settings",
      },
    ],
  },

  {
    id: "auth",
    href: "/auth/sign-in",
    label: "Authentication",
    children: [
      {
        id: "sign-in",
        href: "/auth/sign-in",
        label: "Sign In",
      },

      {
        id: "sign-up",
        href: "/auth/sign-up",
        label: "Sign Up",
      },

      {
        id: "forgot-password",
        href: "/auth/forgot-password",
        label: "Forgot Password",
      },
    ],
  },

  /* -------------------------------------------------------------------------- */
  /*                                   ADMIN                                    */
  /* -------------------------------------------------------------------------- */

  {
    id: "admin",
    href: "/dashboard",
    label: "Dashboard",
    children: [
      /* -------------------------------- Analytics ------------------------------- */

      {
        id: "analytics",
        href: "/dashboard/analytics",
        label: "Analytics",

        children: [
          {
            id: "analytics-sales",
            href: "/dashboard/analytics/sales",
            label: "Sales",
          },

          {
            id: "analytics-inventory",
            href: "/dashboard/analytics/inventory",
            label: "Inventory",
          },

          {
            id: "analytics-branches",
            href: "/dashboard/analytics/branches",
            label: "Branches",
          },

          {
            id: "analytics-customers",
            href: "/dashboard/analytics/customers",
            label: "Customers",
          },

          {
            id: "analytics-products",
            href: "/dashboard/analytics/products",
            label: "Products",
          },
        ],
      },

      /* ---------------------------------- Users --------------------------------- */

      {
        id: "admin-users",
        href: "/dashboard/users",
        label: "Users",

        children: [
          {
            id: "admin-users-create",
            href: "/dashboard/users/create",
            label: "Create",
          },

          {
            id: "admin-users-view",
            href: "/dashboard/users/[id]",
            label: "Overview",

            children: [
              {
                id: "admin-users-edit",
                href: "/dashboard/users/[id]/edit",
                label: "Edit",
              },
            ],
          },
        ],
      },

      /* -------------------------------- Branches -------------------------------- */

      {
        id: "admin-locations",
        href: "/dashboard/locations",
        label: "Locations",
        children: [
          {
            id: "admin-locations-create",
            href: "/dashboard/locations/create",
            label: "Create",
          },

          {
            id: "admin-locations-view",
            href: "/dashboard/locations/[id]",
            label: "Overview",

            children: [
              {
                id: "admin-locations-edit",
                href: "/dashboard/locations/[id]/edit",
                label: "Edit",
              },

              {
                id: "admin-locations-inventory",
                href: "/dashboard/locations/[id]/inventory",
                label: "Inventory",
              },

              {
                id: "admin-locations-orders",
                href: "/dashboard/locations/[id]/orders",
                label: "Orders",
              },

              {
                id: "admin-locations-transfers",
                href: "/dashboard/locations/[id]/transfers",
                label: "Transfers",
              },

              {
                id: "admin-locations-performance",
                href: "/dashboard/locations/[id]/performance",
                label: "Performance",
              },

              {
                id: "admin-locations-webhook",
                href: "/dashboard/locations/[id]/integrations/webhooks",
                label: "Webhooks",
              },
            ],
          },
        ],
      },

      /* -------------------------------- Products -------------------------------- */

      {
        id: "admin-products",
        href: "/dashboard/products",
        label: "Products",

        children: [
          {
            id: "admin-products-create",
            href: "/dashboard/products/create",
            label: "Create",
          },

          {
            id: "admin-products-view",
            href: "/dashboard/products/[id]",
            label: "Overview",

            children: [
              {
                id: "admin-products-edit",
                href: "/dashboard/products/[id]/edit",
                label: "Edit",
              },

              {
                id: "admin-products-variants",
                href: "/dashboard/products/[id]/variants",
                label: "Variants",

                children: [
                  {
                    id: "admin-products-variant-edit",
                    href: "/dashboard/products/[id]/variants/[variantId]/edit",
                    label: "Edit Variant",
                  },
                  {
                    id: "admin-products-variant-create",
                    href: "/dashboard/products/[id]/variants/create",
                    label: "Create",
                  },
                ],
              },

              {
                id: "admin-products-inventory",
                href: "/dashboard/products/[id]/inventory",
                label: "Inventory",
              },

              {
                id: "admin-products-images",
                href: "/dashboard/products/[id]/images",
                label: "Images",
              },

              {
                id: "admin-products-analytics",
                href: "/dashboard/products/[id]/analytics",
                label: "Analytics",
              },
            ],
          },
        ],
      },

      /* ------------------------------- Categories ------------------------------- */

      {
        id: "admin-categories",
        href: "/dashboard/categories",
        label: "Categories",

        children: [
          {
            id: "admin-categories-create",
            href: "/dashboard/categories/create",
            label: "Create",
          },

          {
            id: "admin-categories-edit",
            href: "/dashboard/categories/[id]/edit",
            label: "Edit Category",
          },
        ],
      },

      /* --------------------------------- Brands -------------------------------- */

      {
        id: "admin-brands",
        href: "/dashboard/brands",
        label: "Brands",

        children: [
          {
            id: "admin-brands-create",
            href: "/dashboard/brands/create",
            label: "Create",
          },

          {
            id: "admin-brands-edit",
            href: "/dashboard/brands/[id]/edit",
            label: "Edit Brand",
          },
        ],
      },

      /* ---------------------------------- Tags --------------------------------- */

      {
        id: "admin-tags",
        href: "/dashboard/tags",
        label: "Tags",

        children: [
          {
            id: "admin-tags-create",
            href: "/dashboard/tags/create",
            label: "Create",
          },

          {
            id: "admin-tags-edit",
            href: "/dashboard/tags/[id]/edit",
            label: "Edit Tag",
          },
        ],
      },

      
      {
        id: "admin-uoms",
        href: "/dashboard/uoms",
        label: "Uoms",
        children: [
          {
            id: "admin-uoms-create",
            href: "/dashboard/uoms/create",
            label: "Create",
          },

          {
            id: "admin-uoms-edit",
            href: "/dashboard/uoms/[id]/edit",
            label: "Edit Uom",
          },
        ],
      },

      /* ------------------------------- Attributes ------------------------------- */

      {
        id: "admin-attributes",
        href: "/dashboard/attributes",
        label: "Attributes",

        children: [
          {
            id: "admin-attributes-create",
            href: "/dashboard/attributes/create",
            label: "Create",
          },

          {
            id: "admin-attributes-edit",
            href: "/dashboard/attributes/[id]/edit",
            label: "Edit",
          },

          {
            id: "admin-attributes-values",
            href: "/dashboard/attributes/[id]/values",
            label: "Values",
          },
        ],
      },

      /* ------------------------------- Inventory -------------------------------- */

      {
        id: "admin-inventory",
        href: "/dashboard/inventory",
        label: "Inventory",

        children: [
          {
            id: "admin-low-stock",
            href: "/dashboard/inventory/low-stock",
            label: "Low Stock",
          },

          {
            id: "admin-out-of-stock",
            href: "/dashboard/inventory/out-of-stock",
            label: "Out of Stock",
          },

          {
            id: "admin-overstocked",
            href: "/dashboard/inventory/overstocked",
            label: "Overstocked",
          },

          {
            id: "admin-adjustments",
            href: "/dashboard/inventory/adjustments",
            label: "Adjustments",
          },

          {
            id: "admin-snapshots",
            href: "/dashboard/inventory/snapshots",
            label: "Snapshots",
          },
        ],
      },

      /* ---------------------------- Transfer Orders ----------------------------- */

      {
        id: "transfer-orders",
        href: "/dashboard/transfer-orders",
        label: "Transfer Orders",

        children: [
          {
            id: "transfer-orders-create",
            href: "/dashboard/transfer-orders/create",
            label: "Create",
          },

          {
            id: "transfer-orders-view",
            href: "/dashboard/transfer-orders/[id]",
            label: "Overview",

            children: [
              {
                id: "transfer-orders-edit",
                href: "/dashboard/transfer-orders/[id]/edit",
                label: "Edit",
              },

              {
                id: "transfer-orders-shipment",
                href: "/dashboard/transfer-orders/[id]/shipment",
                label: "Shipment",
              },

              {
                id: "transfer-orders-payment",
                href: "/dashboard/transfer-orders/[id]/payment",
                label: "Payment",
              },
            ],
          },
        ],
      },

      /* ---------------------------- Customer Orders ----------------------------- */

      {
        id: "customer-orders",
        href: "/dashboard/customer-orders",
        label: "Customer Orders",

        children: [
          {
            id: "customer-orders-view",
            href: "/dashboard/customer-orders/[id]",
            label: "Overview",

            children: [
              {
                id: "customer-orders-invoice",
                href: "/dashboard/customer-orders/[id]/invoice",
                label: "Invoice",
              },

              {
                id: "customer-orders-fulfillment",
                href: "/dashboard/customer-orders/[id]/fulfillment",
                label: "Fulfillment",
              },

              {
                id: "customer-orders-tracking",
                href: "/dashboard/customer-orders/[id]/tracking",
                label: "Tracking",
              },
            ],
          },
        ],
      },

      /* ------------------------------ Fulfillments ------------------------------ */

      {
        id: "fulfillments",
        href: "/dashboard/fulfillments",
        label: "Fulfillments",

        children: [
          {
            id: "fulfillments-pickup",
            href: "/dashboard/fulfillments/pickup",
            label: "Pickup",
          },

          {
            id: "fulfillments-delivery",
            href: "/dashboard/fulfillments/delivery",
            label: "Delivery",
          },

          {
            id: "fulfillments-view",
            href: "/dashboard/fulfillments/[id]",
            label: "Overview",
          },
        ],
      },

      /* ---------------------------------- Carts -------------------------------- */

      {
        id: "admin-carts",
        href: "/dashboard/carts",
        label: "Carts",
      },

      /* ----------------------------------- ETL --------------------------------- */

      {
        id: "etl",
        href: "/dashboard/etl",
        label: "ETL",

        children: [
          {
            id: "etl-logs",
            href: "/dashboard/etl/logs",
            label: "Logs",
          },

          {
            id: "etl-sync",
            href: "/dashboard/etl/sync",
            label: "Sync",
          },

          {
            id: "etl-schedules",
            href: "/dashboard/etl/schedules",
            label: "Schedules",
          },
        ],
      },

      /* -------------------------------- Reports -------------------------------- */

      {
        id: "reports",
        href: "/dashboard/reports",
        label: "Reports",

        children: [
          {
            id: "reports-sales",
            href: "/dashboard/reports/sales",
            label: "Sales",
          },

          {
            id: "reports-inventory",
            href: "/dashboard/reports/inventory",
            label: "Inventory",
          },

          {
            id: "reports-branches",
            href: "/dashboard/reports/branches",
            label: "Branches",
          },

          {
            id: "reports-products",
            href: "/dashboard/reports/products",
            label: "Products",
          },

          {
            id: "reports-export",
            href: "/dashboard/reports/export",
            label: "Export",
          },
        ],
      },

      /* -------------------------------- Settings ------------------------------- */

      {
        id: "settings",
        href: "/dashboard/settings",
        label: "Settings",

        children: [
          {
            id: "settings-general",
            href: "/dashboard/settings/general",
            label: "General",
          },

          {
            id: "settings-database",
            href: "/dashboard/settings/database",
            label: "Database",
          },

          {
            id: "settings-sync",
            href: "/dashboard/settings/sync",
            label: "Sync",
          },

          {
            id: "settings-payment",
            href: "/dashboard/settings/payment",
            label: "Payment",
          },
          {
            id: "settings-trash",
            href: "/dashboard/settings/trash",
            label: "Trash",
          },
        ],
      },
    ],
  },
];


export const productNav = (id: string) => [
  {
    label: "Overview",
    url: `/dashboard/products/${id}`,
  },
  {
    label: "Variants",
    url: `/dashboard/products/${id}/variants`,
  },
  {
    label: "Images",
    url: `/dashboard/products/${id}/images`,
  },
  {
    label: "Inventory",
    url: `/dashboard/products/${id}/inventory`,
  },
  {
    label: "Analytics",
    url: `/dashboard/products/${id}/analytics`,
  },
];



// admin: [
    //     {
    //         name: "Global Inventory",
    //         url: "/dashboard/inventory",
    //         icon: Package,
    //     },
    //     {
    //         name: "Transfer Orders",
    //         url: "/dashboard/transfers",
    //         icon: Send,
    //     },
    //     {
    //         name: "Customer Orders",
    //         url: "/dashboard/orders",
    //         icon: Megaphone,
    //     },
    //     {
    //         name: "Fulfillment Management",
    //         url: "/dashboard/fulfillments",
    //         icon: Truck,
    //     },
    //     {
    //         name: "Products",
    //         url: "/dashboard/products",
    //         icon: Box,
    //     },
    //     {
    //         name: "Attributes",
    //         url: "/dashboard/attributes",
    //         icon: Settings2,
    //     },
    //     {
    //         name: "Brands",
    //         url: "/dashboard/brands",
    //         icon: Tags,
    //     },
    //     {
    //         name: "Categories",
    //         url: "/dashboard/categories",
    //         icon: FolderTree,
    //     },
    //     {
    //         name: "Configuration",
    //         url: "/dashboard/configuration",
    //         icon: Settings2,
    //     },
    //     {
    //         name: "Branches & Locations",
    //         url: "/dashboard/branches",
    //         icon: MapPin,
    //     },
    // ],


    // adminMain: [
  //   {
  //     title: "Global Inventory",
  //     url: "/dashboard",
  //     icon: Package,
  //     isActive: true,
  //   },
  //   {
  //     title: "Models",
  //     url: "#",
  //     icon: Bot,
  //     items: [
  //       {
  //         title: "Genesis",
  //         url: "/dashboard/genesis",
  //       },
  //       {
  //         title: "Explorer",
  //         url: "/dashboard/explorer",
  //       },
  //       {
  //         title: "Quantum",
  //         url: "/dashboard/quantum",
  //       },
  //     ],
  //   },
  //   {
  //     title: "products",
  //     url: "/dashboard/products",
  //     icon: BookOpen,
  //     items: [
  //       {
  //         title: "Create",
  //         url: "/dashboard/products/create",
  //       },
  //     ],
  //   },
  // ],
  

// export const breadcrumbsMap = [
//   {
//     id: 'admin',
//     href: "/dashboard",
//     label: "Dashboard",
//     children: [
//       {
//         id: 'admin-products',
//         href: "/dashboard/products",
//         label: "products",
//         children: [
//           {
//             id: 'admin-products-view',
//             href: "admin/products/[id]",
//             label: "{productName}",
//             children: [
//               {
//                 id: 'admin-products-edit',
//                 href: "admin/products/[id]/edit",
//                 label: "Edit",
//               },
//             ],
//           },
//           {
//             id: 'admin-products-create',
//             href: "admin/products/create",
//             label: "Create",
//           },
//         ],
//       },
//     ],
//   },
//   {
//     id: 'products',
//     href: "/products",
//     label: "Products",
//     children: [
//       {
//         id: 'products-view',
//         href: "/products/[slug]",
//         label: "{productName}",
//       }
//     ],
//   },
// ];



