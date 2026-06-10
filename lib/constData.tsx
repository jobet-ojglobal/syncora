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
  //     url: "/admin",
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
  //         url: "/admin/genesis",
  //       },
  //       {
  //         title: "Explorer",
  //         url: "/admin/explorer",
  //       },
  //       {
  //         title: "Quantum",
  //         url: "/admin/quantum",
  //       },
  //     ],
  //   },
  //   {
  //     title: "products",
  //     url: "/admin/products",
  //     icon: BookOpen,
  //     items: [
  //       {
  //         title: "Create",
  //         url: "/admin/products/create",
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
      url: "/admin",
      icon: LayoutDashboard,
    },

    // {
    //   title: "POS",
    //   url: "/admin/pos",
    //   icon: MonitorCheck,
    // },

    /* -------------------------------------------------------------------------- */
    /*                                  ANALYTICS                                 */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Analytics",
    //   url: "/admin/analytics",
    //   icon: BarChart3,
    //   items: [
    //     {
    //       title: "Sales",
    //       url: "/admin/analytics/sales",
    //     },
    //     {
    //       title: "Inventory",
    //       url: "/admin/analytics/inventory",
    //     },
    //     {
    //       title: "Branches",
    //       url: "/admin/analytics/branches",
    //     },
    //     {
    //       title: "Customers",
    //       url: "/admin/analytics/customers",
    //     },
    //     {
    //       title: "Products",
    //       url: "/admin/analytics/products",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                    USERS                                   */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Users",
    //   url: "/admin/users",
    //   icon: Users,
    //   items: [
    //     {
    //       title: "All Users",
    //       url: "/admin/users",
    //     },
    //     {
    //       title: "Create User",
    //       url: "/admin/users/create",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                  BRANCHES                                  */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Branches",
    //   url: "/admin/branches",
    //   icon: Building2,
    //   items: [
    //     {
    //       title: "All Branches",
    //       url: "/admin/branches",
    //     },
    //     {
    //       title: "Create Branch",
    //       url: "/admin/branches/create",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                  PRODUCTS                                  */
    /* -------------------------------------------------------------------------- */

    {
      title: "Products",
      url: "/admin/products",
      icon: Package,
      items: [
        {
          title: "All Products",
          url: "/admin/products",
        },
        {
          title: "Create Product",
          url: "/admin/products/create",
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /*                                 CATEGORIES                                 */
    /* -------------------------------------------------------------------------- */

    {
      title: "Categories",
      url: "/admin/categories",
      icon: Boxes,
      items: [
        {
          title: "All Categories",
          url: "/admin/categories",
        },
        {
          title: "Create Category",
          url: "/admin/categories/create",
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /*                                    BRANDS                                  */
    /* -------------------------------------------------------------------------- */

    {
      title: "Brands",
      url: "/admin/brands",
      icon: Layers,
      items: [
        {
          title: "All Brands",
          url: "/admin/brands",
        },
        {
          title: "Create Brand",
          url: "/admin/brands/create",
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /*                                     TAGS                                   */
    /* -------------------------------------------------------------------------- */

    {
      title: "Tags",
      url: "/admin/tags",
      icon: Tags,
      items: [
        {
          title: "All Tags",
          url: "/admin/tags",
        },
        {
          title: "Create Tag",
          url: "/admin/tags/create",
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /*                                 ATTRIBUTES                                 */
    /* -------------------------------------------------------------------------- */

    {
      title: "Attributes",
      url: "/admin/attributes",
      icon: Layers,
      items: [
        {
          title: "All Attributes",
          url: "/admin/attributes",
        },
        {
          title: "Create Attribute",
          url: "/admin/attributes/create",
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /*                                  INVENTORY                                 */
    /* -------------------------------------------------------------------------- */

    {
      title: "Inventory",
      url: "/admin/inventory",
      icon: Warehouse,
      items: [
        {
          title: "Overview",
          url: "/admin/inventory",
        },
        {
          title: "Low Stock",
          url: "/admin/inventory/low-stock",
        },
        {
          title: "Out of Stock",
          url: "/admin/inventory/out-of-stock",
        },
        {
          title: "Overstocked",
          url: "/admin/inventory/overstocked",
        },
        {
          title: "Adjustments",
          url: "/admin/inventory/adjustments",
        },
        {
          title: "Snapshots",
          url: "/admin/inventory/snapshots",
        },
      ],
    },

    /* -------------------------------------------------------------------------- */
    /*                               TRANSFER ORDERS                              */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Transfer Orders",
    //   url: "/admin/transfer-orders",
    //   icon: Truck,
    //   items: [
    //     {
    //       title: "All Transfers",
    //       url: "/admin/transfer-orders",
    //     },
    //     {
    //       title: "Create Transfer",
    //       url: "/admin/transfer-orders/create",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                               CUSTOMER ORDERS                              */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Customer Orders",
    //   url: "/admin/customer-orders",
    //   icon: ShoppingCart,
    //   items: [
    //     {
    //       title: "All Orders",
    //       url: "/admin/customer-orders",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                FULFILLMENTS                                */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Fulfillments",
    //   url: "/admin/fulfillments",
    //   icon: ClipboardCheck,
    //   items: [
    //     {
    //       title: "All Fulfillments",
    //       url: "/admin/fulfillments",
    //     },
    //     {
    //       title: "Pickup",
    //       url: "/admin/fulfillments/pickup",
    //     },
    //     {
    //       title: "Delivery",
    //       url: "/admin/fulfillments/delivery",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                    CARTS                                   */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Carts",
    //   url: "/admin/carts",
    //   icon: ShoppingCart,
    // },

    /* -------------------------------------------------------------------------- */
    /*                                     ETL                                    */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "ETL",
    //   url: "/admin/etl",
    //   icon: Database,
    //   items: [
    //     {
    //       title: "Logs",
    //       url: "/admin/etl/logs",
    //     },
    //     {
    //       title: "Sync",
    //       url: "/admin/etl/sync",
    //     },
    //     {
    //       title: "Schedules",
    //       url: "/admin/etl/schedules",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                   REPORTS                                  */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Reports",
    //   url: "/admin/reports",
    //   icon: FileText,
    //   items: [
    //     {
    //       title: "Sales",
    //       url: "/admin/reports/sales",
    //     },
    //     {
    //       title: "Inventory",
    //       url: "/admin/reports/inventory",
    //     },
    //     {
    //       title: "Branches",
    //       url: "/admin/reports/branches",
    //     },
    //     {
    //       title: "Products",
    //       url: "/admin/reports/products",
    //     },
    //     {
    //       title: "Export",
    //       url: "/admin/reports/export",
    //     },
    //   ],
    // },

    /* -------------------------------------------------------------------------- */
    /*                                  SETTINGS                                  */
    /* -------------------------------------------------------------------------- */

    // {
    //   title: "Settings",
    //   url: "/admin/settings",
    //   icon: Settings,
    //   items: [
    //     {
    //       title: "General",
    //       url: "/admin/settings/general",
    //     },
    //     {
    //       title: "Database",
    //       url: "/admin/settings/database",
    //     },
    //     {
    //       title: "Sync",
    //       url: "/admin/settings/sync",
    //     },
    //     {
    //       title: "Payment",
    //       url: "/admin/settings/payment",
    //     },
    //     {
    //       title: "Tax Configuration",
    //       url: "/admin/settings/tax",
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
    href: "/admin",
    label: "Dashboard",
    children: [
      /* -------------------------------- Analytics ------------------------------- */

      {
        id: "analytics",
        href: "/admin/analytics",
        label: "Analytics",

        children: [
          {
            id: "analytics-sales",
            href: "/admin/analytics/sales",
            label: "Sales",
          },

          {
            id: "analytics-inventory",
            href: "/admin/analytics/inventory",
            label: "Inventory",
          },

          {
            id: "analytics-branches",
            href: "/admin/analytics/branches",
            label: "Branches",
          },

          {
            id: "analytics-customers",
            href: "/admin/analytics/customers",
            label: "Customers",
          },

          {
            id: "analytics-products",
            href: "/admin/analytics/products",
            label: "Products",
          },
        ],
      },

      /* ---------------------------------- Users --------------------------------- */

      {
        id: "admin-users",
        href: "/admin/users",
        label: "Users",

        children: [
          {
            id: "admin-users-create",
            href: "/admin/users/create",
            label: "Create",
          },

          {
            id: "admin-users-view",
            href: "/admin/users/[id]",
            label: "Overview",

            children: [
              {
                id: "admin-users-edit",
                href: "/admin/users/[id]/edit",
                label: "Edit",
              },
            ],
          },
        ],
      },

      /* -------------------------------- Branches -------------------------------- */

      {
        id: "admin-branches",
        href: "/admin/branches",
        label: "Branches",
        children: [
          {
            id: "admin-branches-create",
            href: "/admin/branches/create",
            label: "Create",
          },

          {
            id: "admin-branches-view",
            href: "/admin/branches/[id]",
            label: "Overview",

            children: [
              {
                id: "admin-branches-edit",
                href: "/admin/branches/[id]/edit",
                label: "Edit",
              },

              {
                id: "admin-branches-inventory",
                href: "/admin/branches/[id]/inventory",
                label: "Inventory",
              },

              {
                id: "admin-branches-orders",
                href: "/admin/branches/[id]/orders",
                label: "Orders",
              },

              {
                id: "admin-branches-transfers",
                href: "/admin/branches/[id]/transfers",
                label: "Transfers",
              },

              {
                id: "admin-branches-performance",
                href: "/admin/branches/[id]/performance",
                label: "Performance",
              },
            ],
          },
        ],
      },

      /* -------------------------------- Products -------------------------------- */

      {
        id: "admin-products",
        href: "/admin/products",
        label: "Products",

        children: [
          {
            id: "admin-products-create",
            href: "/admin/products/create",
            label: "Create",
          },

          {
            id: "admin-products-view",
            href: "/admin/products/[id]",
            label: "Overview",

            children: [
              {
                id: "admin-products-edit",
                href: "/admin/products/[id]/edit",
                label: "Edit",
              },

              {
                id: "admin-products-variants",
                href: "/admin/products/[id]/variants",
                label: "Variants",

                children: [
                  {
                    id: "admin-products-variant-edit",
                    href: "/admin/products/[id]/variants/[variantId]/edit",
                    label: "Edit Variant",
                  },
                  {
                    id: "admin-products-variant-create",
                    href: "/admin/products/[id]/variants/create",
                    label: "Create",
                  },
                ],
              },

              {
                id: "admin-products-inventory",
                href: "/admin/products/[id]/inventory",
                label: "Inventory",
              },

              {
                id: "admin-products-images",
                href: "/admin/products/[id]/images",
                label: "Images",
              },

              {
                id: "admin-products-analytics",
                href: "/admin/products/[id]/analytics",
                label: "Analytics",
              },
            ],
          },
        ],
      },

      /* ------------------------------- Categories ------------------------------- */

      {
        id: "admin-categories",
        href: "/admin/categories",
        label: "Categories",

        children: [
          {
            id: "admin-categories-create",
            href: "/admin/categories/create",
            label: "Create",
          },

          {
            id: "admin-categories-edit",
            href: "/admin/categories/[id]/edit",
            label: "Edit Category",
          },
        ],
      },

      /* --------------------------------- Brands -------------------------------- */

      {
        id: "admin-brands",
        href: "/admin/brands",
        label: "Brands",

        children: [
          {
            id: "admin-brands-create",
            href: "/admin/brands/create",
            label: "Create",
          },

          {
            id: "admin-brands-edit",
            href: "/admin/brands/[id]/edit",
            label: "Edit Brand",
          },
        ],
      },

      /* ---------------------------------- Tags --------------------------------- */

      {
        id: "admin-tags",
        href: "/admin/tags",
        label: "Tags",

        children: [
          {
            id: "admin-tags-create",
            href: "/admin/tags/create",
            label: "Create",
          },

          {
            id: "admin-tags-edit",
            href: "/admin/tags/[id]/edit",
            label: "Edit Tag",
          },
        ],
      },

      /* ------------------------------- Attributes ------------------------------- */

      {
        id: "admin-attributes",
        href: "/admin/attributes",
        label: "Attributes",

        children: [
          {
            id: "admin-attributes-create",
            href: "/admin/attributes/create",
            label: "Create",
          },

          {
            id: "admin-attributes-edit",
            href: "/admin/attributes/[id]/edit",
            label: "Edit",
          },

          {
            id: "admin-attributes-values",
            href: "/admin/attributes/[id]/values",
            label: "Values",
          },
        ],
      },

      /* ------------------------------- Inventory -------------------------------- */

      {
        id: "admin-inventory",
        href: "/admin/inventory",
        label: "Inventory",

        children: [
          {
            id: "admin-low-stock",
            href: "/admin/inventory/low-stock",
            label: "Low Stock",
          },

          {
            id: "admin-out-of-stock",
            href: "/admin/inventory/out-of-stock",
            label: "Out of Stock",
          },

          {
            id: "admin-overstocked",
            href: "/admin/inventory/overstocked",
            label: "Overstocked",
          },

          {
            id: "admin-adjustments",
            href: "/admin/inventory/adjustments",
            label: "Adjustments",
          },

          {
            id: "admin-snapshots",
            href: "/admin/inventory/snapshots",
            label: "Snapshots",
          },
        ],
      },

      /* ---------------------------- Transfer Orders ----------------------------- */

      {
        id: "transfer-orders",
        href: "/admin/transfer-orders",
        label: "Transfer Orders",

        children: [
          {
            id: "transfer-orders-create",
            href: "/admin/transfer-orders/create",
            label: "Create",
          },

          {
            id: "transfer-orders-view",
            href: "/admin/transfer-orders/[id]",
            label: "Overview",

            children: [
              {
                id: "transfer-orders-edit",
                href: "/admin/transfer-orders/[id]/edit",
                label: "Edit",
              },

              {
                id: "transfer-orders-shipment",
                href: "/admin/transfer-orders/[id]/shipment",
                label: "Shipment",
              },

              {
                id: "transfer-orders-payment",
                href: "/admin/transfer-orders/[id]/payment",
                label: "Payment",
              },
            ],
          },
        ],
      },

      /* ---------------------------- Customer Orders ----------------------------- */

      {
        id: "customer-orders",
        href: "/admin/customer-orders",
        label: "Customer Orders",

        children: [
          {
            id: "customer-orders-view",
            href: "/admin/customer-orders/[id]",
            label: "Overview",

            children: [
              {
                id: "customer-orders-invoice",
                href: "/admin/customer-orders/[id]/invoice",
                label: "Invoice",
              },

              {
                id: "customer-orders-fulfillment",
                href: "/admin/customer-orders/[id]/fulfillment",
                label: "Fulfillment",
              },

              {
                id: "customer-orders-tracking",
                href: "/admin/customer-orders/[id]/tracking",
                label: "Tracking",
              },
            ],
          },
        ],
      },

      /* ------------------------------ Fulfillments ------------------------------ */

      {
        id: "fulfillments",
        href: "/admin/fulfillments",
        label: "Fulfillments",

        children: [
          {
            id: "fulfillments-pickup",
            href: "/admin/fulfillments/pickup",
            label: "Pickup",
          },

          {
            id: "fulfillments-delivery",
            href: "/admin/fulfillments/delivery",
            label: "Delivery",
          },

          {
            id: "fulfillments-view",
            href: "/admin/fulfillments/[id]",
            label: "Overview",
          },
        ],
      },

      /* ---------------------------------- Carts -------------------------------- */

      {
        id: "admin-carts",
        href: "/admin/carts",
        label: "Carts",
      },

      /* ----------------------------------- ETL --------------------------------- */

      {
        id: "etl",
        href: "/admin/etl",
        label: "ETL",

        children: [
          {
            id: "etl-logs",
            href: "/admin/etl/logs",
            label: "Logs",
          },

          {
            id: "etl-sync",
            href: "/admin/etl/sync",
            label: "Sync",
          },

          {
            id: "etl-schedules",
            href: "/admin/etl/schedules",
            label: "Schedules",
          },
        ],
      },

      /* -------------------------------- Reports -------------------------------- */

      {
        id: "reports",
        href: "/admin/reports",
        label: "Reports",

        children: [
          {
            id: "reports-sales",
            href: "/admin/reports/sales",
            label: "Sales",
          },

          {
            id: "reports-inventory",
            href: "/admin/reports/inventory",
            label: "Inventory",
          },

          {
            id: "reports-branches",
            href: "/admin/reports/branches",
            label: "Branches",
          },

          {
            id: "reports-products",
            href: "/admin/reports/products",
            label: "Products",
          },

          {
            id: "reports-export",
            href: "/admin/reports/export",
            label: "Export",
          },
        ],
      },

      /* -------------------------------- Settings ------------------------------- */

      {
        id: "settings",
        href: "/admin/settings",
        label: "Settings",

        children: [
          {
            id: "settings-general",
            href: "/admin/settings/general",
            label: "General",
          },

          {
            id: "settings-database",
            href: "/admin/settings/database",
            label: "Database",
          },

          {
            id: "settings-sync",
            href: "/admin/settings/sync",
            label: "Sync",
          },

          {
            id: "settings-payment",
            href: "/admin/settings/payment",
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
    url: `/admin/branches/${id}`,
  },
  {
    label: "Inventory",
    url: `/admin/branches/${id}/inventory`,
  },
  {
    label: "Orders",
    url: `/admin/branches/${id}/orders`,
  },
  {
    label: "Transfers",
    url: `/admin/branches/${id}/transfers`,
  },
  {
    label: "Performance",
    url: `/admin/branches/${id}/performance`,
  },
  {
    label: "Staff",
    url: `/admin/branches/${id}/staff`,
  },
];

export const productNav = (id: string) => [
  {
    label: "Overview",
    url: `/admin/products/${id}`,
  },
  {
    label: "Variants",
    url: `/admin/products/${id}/variants`,
  },
  {
    label: "Images",
    url: `/admin/products/${id}/images`,
  },
  {
    label: "Inventory",
    url: `/admin/products/${id}/inventory`,
  },
  {
    label: "Analytics",
    url: `/admin/products/${id}/analytics`,
  },
];

// export const breadcrumbsMap = [
//   {
//     id: 'admin',
//     href: "/admin",
//     label: "Dashboard",
//     children: [
//       {
//         id: 'admin-products',
//         href: "/admin/products",
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



