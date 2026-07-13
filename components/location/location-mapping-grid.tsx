import { Coins, Tags, Users2, Settings2, Link2, ShoppingBag, Landmark, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BasicLocationResponse } from "@/types/location.type"; // adjust path as needed

interface LocationMappingGridProps {
  location: BasicLocationResponse;
}

export function LocationMappingGrid({ location }: LocationMappingGridProps) {
  const mappingGroups = [
    {
      title: "Financial & Tax Overrides",
      description: "Local localized taxing schemes, billing rules, and active currency configurations.",
      icon: Coins,
      badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50",
      metrics: [
        { label: "Taxing Schemes", count: location.mappings.taxingSchemesCount },
        { label: "Currency Maps", count: location.mappings.currenciesCount },
        { label: "Payment Terms", count: location.mappings.paymentTermsCount },
      ]
    },
    {
      title: "Catalog Rules & Inventory Overrides",
      description: "Custom specific cost adjustments, local barcodes overrides, and variation structures mapped to this floor.",
      icon: Tags,
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50",
      metrics: [
        { label: "Cost Adjustments", count: location.mappings.costAdjustmentsCount },
        { label: "Custom Barcodes", count: location.mappings.barcodesCount },
        { label: "Category Rules", count: location.mappings.categoriesCount },
      ]
    },
    {
      title: "Stakeholder Credit Ledgers (CRM/SRM)",
      description: "Active balance tracking sheets, customized pricing schemes maps, and localized outstanding credits.",
      icon: Users2,
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50",
      metrics: [
        { label: "Pricing Schemes", count: location.mappings.pricingSchemesCount },
        { label: "Customer Balances", count: location.mappings.customerBalancesCount },
        { label: "Vendor Credits", count: location.mappings.vendorCreditsCount },
      ]
    }
  ];

  // Core tracking entities added below the override matrices
  const coreEntities = [
    {
      label: "Mapped Customers",
      count: location.mappings.customersCount ?? 0,
      description: "Assigned accounts and buyers",
      icon: Users,
      color: "text-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-200/30"
    },
    {
      label: "Mapped Products",
      count: location.mappings.productsCount ?? 0,
      description: "SKUs allocated to inventory",
      icon: ShoppingBag,
      color: "text-amber-500 bg-amber-500/5 dark:bg-amber-500/10 border-amber-200/30"
    },
    {
      label: "Mapped Vendors",
      count: location.mappings.vendorsCount ?? 0,
      description: "Suppliers tied to procurement",
      icon: Landmark,
      color: "text-rose-500 bg-rose-500/5 dark:bg-rose-500/10 border-rose-200/30"
    }
  ];

  return (
    <div className="space-y-6 mt-8">
      {/* SECTION 1: Overrides Matrix */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Synchronized ERP Local Override Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review structural indices mapping configurations coming down from core inFlow instances.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mappingGroups.map((group, index) => {
            const Icon = group.icon;
            return (
              <div key={index} className="border border-border bg-card rounded-xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${group.badgeColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h4 className="text-xs font-bold text-foreground tracking-tight">{group.title}</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal font-medium">
                    {group.description}
                  </p>
                </div>

                {/* Individual sub-row metric loops */}
                <div className="divide-y divide-border/60 border-t pt-2">
                  {group.metrics.map((metric, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 text-xs font-medium">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Link2 className="h-3 w-3 text-muted-foreground/40" />
                        {metric.label}
                      </span>
                      <Badge variant={metric.count > 0 ? "default" : "secondary"} className="h-4.5 px-1.5 text-[10px] font-bold">
                        {metric.count > 0 ? `${metric.count} Mapped` : "Inherited"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Master Data Entity Counts */}
      <div className="space-y-3 pt-2 border-t border-border/40">
        <div>
          <h4 className="text-xs font-bold text-foreground tracking-tight">
            Synchronized Master Records
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Total active entity relationships bound exclusively to this operational node.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {coreEntities.map((entity, idx) => {
            const EntityIcon = entity.icon;
            return (
              <div 
                key={idx} 
                className="border border-border bg-card rounded-xl p-4 flex items-center justify-between shadow-3xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${entity.color}`}>
                    <EntityIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{entity.label}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{entity.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-foreground tracking-tight">
                    {entity.count.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}