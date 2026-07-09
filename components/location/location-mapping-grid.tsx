import { Coins, Tags, Users2, Settings2, Link2 } from "lucide-react";
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

  return (
    <div className="space-y-4 mt-8">
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
  );
}