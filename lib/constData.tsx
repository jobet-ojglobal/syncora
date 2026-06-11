  import {
  LayoutDashboard,
  Package,
  Boxes,
  Tags,
  Layers,
  Building2,
  Users,
  Warehouse,
  Truck,
  ShoppingCart,
  ClipboardCheck,
  BarChart3,
  FileText,
  Database,
  Settings,
  FolderSync,
  Receipt,
  Tablet,
  MonitorCheck,
} from "lucide-react";

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

export const data = {
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


  adminMain: [
    /* -------------------------------------------------------------------------- */
    /*                                  DASHBOARD                                 */
    /* -------------------------------------------------------------------------- */

    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },

    // {
    //   title: "POS",
    //   url: "/dashboard/pos",
    //   icon: MonitorCheck,
    // },

    /* -------------------------------------------------------------------------- */
    /*                                  ANALYTICS                                 */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Analytics",
    //   url: "/dashboard/analytics",
    //   icon: BarChart3,
    //   items: [
    //     {
    //       title: "Sales",
    //       url: "/dashboard/analytics/sales",
    //     },
    //     {
    //       title: "Inventory",
    //       url: "/dashboard/analytics/inventory",
    //     },
    //     {
    //       title: "Branches",
    //       url: "/dashboard/analytics/branches",
    //     },
    //     {
    //       title: "Customers",
    //       url: "/dashboard/analytics/customers",
    //     },
    //     {
    //       title: "Products",
    //       url: "/dashboard/analytics/products",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                    USERS                                   */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Users",
    //   url: "/dashboard/users",
    //   icon: Users,
    //   items: [
    //     {
    //       title: "All Users",
    //       url: "/dashboard/users",
    //     },
    //     {
    //       title: "Create User",
    //       url: "/dashboard/users/create",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                  BRANCHES                                  */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Branches",
    //   url: "/dashboard/branches",
    //   icon: Building2,
    //   items: [
    //     {
    //       title: "All Branches",
    //       url: "/dashboard/branches",
    //     },
    //     {
    //       title: "Create Branch",
    //       url: "/dashboard/branches/create",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                  PRODUCTS                                  */
    /* -------------------------------------------------------------------------- */

    {
      title: "Products",
      url: "/dashboard/products",
      icon: Package,
      items: [
        {
          title: "All Products",
          url: "/dashboard/products",
        },
        {
          title: "Create Product",
          url: "/dashboard/products/create",
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /*                                 CATEGORIES                                 */
    /* -------------------------------------------------------------------------- */

    {
      title: "Categories",
      url: "/dashboard/categories",
      icon: Boxes,
      items: [
        {
          title: "All Categories",
          url: "/dashboard/categories",
        },
        {
          title: "Create Category",
          url: "/dashboard/categories/create",
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /*                                    BRANDS                                  */
    /* -------------------------------------------------------------------------- */

    {
      title: "Brands",
      url: "/dashboard/brands",
      icon: Layers,
      items: [
        {
          title: "All Brands",
          url: "/dashboard/brands",
        },
        {
          title: "Create Brand",
          url: "/dashboard/brands/create",
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /*                                     TAGS                                   */
    /* -------------------------------------------------------------------------- */

    {
      title: "Tags",
      url: "/dashboard/tags",
      icon: Tags,
      items: [
        {
          title: "All Tags",
          url: "/dashboard/tags",
        },
        {
          title: "Create Tag",
          url: "/dashboard/tags/create",
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /*                                 ATTRIBUTES                                 */
    /* -------------------------------------------------------------------------- */

    {
      title: "Attributes",
      url: "/dashboard/attributes",
      icon: Layers,
      items: [
        {
          title: "All Attributes",
          url: "/dashboard/attributes",
        },
        {
          title: "Create Attribute",
          url: "/dashboard/attributes/create",
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /*                                  INVENTORY                                 */
    /* -------------------------------------------------------------------------- */

    {
      title: "Inventory",
      url: "/dashboard/inventory",
      icon: Warehouse,
      items: [
        {
          title: "Overview",
          url: "/dashboard/inventory",
        },
        {
          title: "Low Stock",
          url: "/dashboard/inventory/low-stock",
        },
        {
          title: "Out of Stock",
          url: "/dashboard/inventory/out-of-stock",
        },
        {
          title: "Overstocked",
          url: "/dashboard/inventory/overstocked",
        },
        {
          title: "Adjustments",
          url: "/dashboard/inventory/adjustments",
        },
        {
          title: "Snapshots",
          url: "/dashboard/inventory/snapshots",
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /*                               TRANSFER ORDERS                              */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Transfer Orders",
    //   url: "/dashboard/transfer-orders",
    //   icon: Truck,
    //   items: [
    //     {
    //       title: "All Transfers",
    //       url: "/dashboard/transfer-orders",
    //     },
    //     {
    //       title: "Create Transfer",
    //       url: "/dashboard/transfer-orders/create",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                               CUSTOMER ORDERS                              */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Customer Orders",
    //   url: "/dashboard/customer-orders",
    //   icon: ShoppingCart,
    //   items: [
    //     {
    //       title: "All Orders",
    //       url: "/dashboard/customer-orders",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                FULFILLMENTS                                */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Fulfillments",
    //   url: "/dashboard/fulfillments",
    //   icon: ClipboardCheck,
    //   items: [
    //     {
    //       title: "All Fulfillments",
    //       url: "/dashboard/fulfillments",
    //     },
    //     {
    //       title: "Pickup",
    //       url: "/dashboard/fulfillments/pickup",
    //     },
    //     {
    //       title: "Delivery",
    //       url: "/dashboard/fulfillments/delivery",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                    CARTS                                   */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Carts",
    //   url: "/dashboard/carts",
    //   icon: ShoppingCart,
    // },

    /* -------------------------------------------------------------------------- */
    /*                                     ETL                                    */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "ETL",
    //   url: "/dashboard/etl",
    //   icon: Database,
    //   items: [
    //     {
    //       title: "Logs",
    //       url: "/dashboard/etl/logs",
    //     },
    //     {
    //       title: "Sync",
    //       url: "/dashboard/etl/sync",
    //     },
    //     {
    //       title: "Schedules",
    //       url: "/dashboard/etl/schedules",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                   REPORTS                                  */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Reports",
    //   url: "/dashboard/reports",
    //   icon: FileText,
    //   items: [
    //     {
    //       title: "Sales",
    //       url: "/dashboard/reports/sales",
    //     },
    //     {
    //       title: "Inventory",
    //       url: "/dashboard/reports/inventory",
    //     },
    //     {
    //       title: "Branches",
    //       url: "/dashboard/reports/branches",
    //     },
    //     {
    //       title: "Products",
    //       url: "/dashboard/reports/products",
    //     },
    //     {
    //       title: "Export",
    //       url: "/dashboard/reports/export",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                  SETTINGS                                  */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Settings",
    //   url: "/dashboard/settings",
    //   icon: Settings,
    //   items: [
    //     {
    //       title: "General",
    //       url: "/dashboard/settings/general",
    //     },
    //     {
    //       title: "Database",
    //       url: "/dashboard/settings/database",
    //     },
    //     {
    //       title: "Sync",
    //       url: "/dashboard/settings/sync",
    //     },
    //     {
    //       title: "Payment",
    //       url: "/dashboard/settings/payment",
    //     },
    //     {
    //       title: "Tax Configuration",
    //       url: "/dashboard/settings/tax",
    //     },
    //   ],
    // },
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
        id: "admin-branches",
        href: "/dashboard/branches",
        label: "Branches",
        children: [
          {
            id: "admin-branches-create",
            href: "/dashboard/branches/create",
            label: "Create",
          },

          {
            id: "admin-branches-view",
            href: "/dashboard/branches/[id]",
            label: "Overview",

            children: [
              {
                id: "admin-branches-edit",
                href: "/dashboard/branches/[id]/edit",
                label: "Edit",
              },

              {
                id: "admin-branches-inventory",
                href: "/dashboard/branches/[id]/inventory",
                label: "Inventory",
              },

              {
                id: "admin-branches-orders",
                href: "/dashboard/branches/[id]/orders",
                label: "Orders",
              },

              {
                id: "admin-branches-transfers",
                href: "/dashboard/branches/[id]/transfers",
                label: "Transfers",
              },

              {
                id: "admin-branches-performance",
                href: "/dashboard/branches/[id]/performance",
                label: "Performance",
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
        ],
      },
    ],
  },
];


export const branchNav = (id: string) => [
  {
    label: "Overview",
    url: `/dashboard/branches/${id}`,
  },
  {
    label: "Inventory",
    url: `/dashboard/branches/${id}/inventory`,
  },
  {
    label: "Orders",
    url: `/dashboard/branches/${id}/orders`,
  },
  {
    label: "Transfers",
    url: `/dashboard/branches/${id}/transfers`,
  },
  {
    label: "Performance",
    url: `/dashboard/branches/${id}/performance`,
  },
  {
    label: "Staff",
    url: `/dashboard/branches/${id}/staff`,
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



