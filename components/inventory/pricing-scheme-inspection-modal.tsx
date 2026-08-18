import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InventoryStockRow } from "@/app/dashboard/locations/[id]/(viewLayout)/inventory/InventoryTable";
import { DollarSign, Percent, Tag } from "lucide-react";
import { Badge } from "../ui/badge";

export function PricingSchemeInspectionModal({
  item,
  onClose,
}: {
  item: InventoryStockRow | null;
  onClose: () => void;
}) {
  if (!item) return null;

  const prices = item.product.prices || [];

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Tag className="w-4 h-4 text-emerald-500" />
            Pricing Schemes for {item.product.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            SKU: <span className="font-mono">{item.product.sku || "N/A"}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {prices.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              No pricing schemes configured for this product.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-[10px] uppercase font-bold">Pricing Scheme</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Type</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-right">Price / Markup</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {prices.map((p) => {
                    const isDefault = p.pricingScheme.isDefault;
                    const currency = p.pricingScheme.currencySymbol;

                    return (
                      <TableRow key={p.id} className={isDefault ? "bg-emerald-500/5 font-medium" : ""}>
                        <TableCell className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">
                              {p.pricingScheme.name}
                            </span>
                            {isDefault && (
                              <Badge variant="outline" className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 px-1 py-0">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                            <span>{p.pricingScheme.currencyCode}</span>
                            <span>•</span>
                            <span>{p.pricingScheme.isTaxInclusive ? "Tax Incl." : "Excl. Tax"}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground font-sans">
                          {p.priceType === "FixedPrice" ? (
                            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded text-[10px]">
                              <DollarSign className="w-2.5 h-2.5" /> Fixed Price
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded text-[10px]">
                              <Percent className="w-2.5 h-2.5" /> Fixed Markup
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-right font-mono font-bold text-foreground text-[13px]">
                          {p.priceType === "FixedPrice" && p.unitPrice !== null
                            ? `${currency}${p.unitPrice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : p.priceType === "FixedMarkup" && p.fixedMarkup !== null
                            ? `+${currency}${p.fixedMarkup.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}