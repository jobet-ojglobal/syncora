"use client";

import { useEffect, startTransition } from "react";
import { useForm, useFieldArray, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  Building2, User, FileText, Calendar, DollarSign, 
  Plus, Trash2, ShieldAlert, Truck, Package, CheckCircle2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelect } from "../shared/form-select";
import { FormInput } from "../shared/form-input";
import { FormSwitch } from "../shared/form-switch";
import { FormTextarea } from "../shared/form-textarea";
import { PurchaseOrderFormData, purchaseOrderSchema } from "@/schemas/purchase-order.scheme";
import { useRouter } from "next/navigation";

export interface PurchaseOrderFormProps {
  initialData?: Partial<PurchaseOrderFormData>;
  catalogs: {
    vendors: { id: string; name: string }[];
    products: { id: string; name: string; unitPrice?: number }[];
    currencies: { id: string; name: string }[];
    paymentTerms: { id: string; name: string }[];
    taxingSchemes: { id: string; name: string }[];
    locations: { id: string; name: string }[];
    teamMembers: { id: string; name: string }[];
  };
}

export function PurchaseOrderForm({ initialData, catalogs }: PurchaseOrderFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData?.id;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema) as Resolver<PurchaseOrderFormData>,
    defaultValues: {
      id: initialData?.id || "",
      orderNumber: initialData?.orderNumber || `PO-${Math.floor(100000 + Math.random() * 900000)}`,
      vendorOrderNumber: initialData?.vendorOrderNumber || "",
      vendorId: initialData?.vendorId || "",
      locationId: initialData?.locationId || "",
      assignedToTeamMemberId: initialData?.assignedToTeamMemberId || "",
      approverTeamMemberId: initialData?.approverTeamMemberId || "",
      currencyId: initialData?.currencyId || "",
      paymentTermsId: initialData?.paymentTermsId || "",
      taxingSchemeId: initialData?.taxingSchemeId || "",

      paymentStatus: initialData?.paymentStatus || "UNPAID",
      inventoryStatus: initialData?.inventoryStatus || "UNFULFILLED",

      isCancelled: initialData?.isCancelled ?? false,
      isCompleted: initialData?.isCompleted ?? false,
      isQuote: initialData?.isQuote ?? false,
      isTaxInclusive: initialData?.isTaxInclusive ?? false,
      showShipping: initialData?.showShipping ?? true,
      carrier: initialData?.carrier || "",

      orderDate: initialData?.orderDate || new Date().toISOString().split("T")[0],
      dueDate: initialData?.dueDate || "",
      requestShipDate: initialData?.requestShipDate || "",

      contactName: initialData?.contactName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      shipToCompanyName: initialData?.shipToCompanyName || "",

      subTotal: initialData?.subTotal ?? 0,
      freight: initialData?.freight ?? 0,
      amountPaid: initialData?.amountPaid ?? 0,
      balance: initialData?.balance ?? 0,
      total: initialData?.total ?? 0,
      exchangeRate: initialData?.exchangeRate ?? 1.0,

      orderRemarks: initialData?.orderRemarks || "",
      receiveRemarks: initialData?.receiveRemarks || "",

      shipToAddress: initialData?.shipToAddress || {
        address1: "",
        address2: "",
        city: "",
        state: "",
        country: "Philippines",
        postalCode: ""
      },

      lines: initialData?.lines?.length
        ? initialData.lines
        : [
            {
              productId: "",
              vendorItemCode: "",
              description: "",
              unitPrice: 0,
              quantity: 1,
              uom: "PCS",
              discountValue: 0,
              discountIsPercent: false,
              subTotal: 0,
              tax1Rate: 0,
              tax2Rate: 0
            }
          ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines"
  });

  const watchedLines = watch("lines");
  const watchedFreight = watch("freight");
  const watchedAmountPaid = watch("amountPaid");

  // Auto-populate unit price when product selection changes
  useEffect(() => {
    watchedLines?.forEach((line, index) => {
      if (line.productId) {
        const selectedProduct = catalogs.products.find((p) => p.id === line.productId);
        if (selectedProduct && selectedProduct.unitPrice !== undefined) {
          // Only update if price is currently 0 or different
          const currentPrice = line.unitPrice;
          if (currentPrice === 0 || currentPrice === undefined) {
            setValue(`lines.${index}.unitPrice`, selectedProduct.unitPrice);
          }
        }
      }
    });
  }, [watchedLines, catalogs.products, setValue]);

  useEffect(() => {
    let subTotalCalculated = 0;

    watchedLines?.forEach((line, index) => {
      const qty = Number(line.quantity) || 0;
      const price = Number(line.unitPrice) || 0;
      const discountVal = Number(line.discountValue) || 0;

      let lineSubTotal = qty * price;
      if (line.discountIsPercent) {
        lineSubTotal -= lineSubTotal * (discountVal / 100);
      } else {
        lineSubTotal -= discountVal;
      }

      lineSubTotal = Math.max(0, lineSubTotal);
      if (line.subTotal !== lineSubTotal) {
        setValue(`lines.${index}.subTotal`, lineSubTotal);
      }
      subTotalCalculated += lineSubTotal;
    });

    const freightVal = Number(watchedFreight) || 0;
    const amountPaidVal = Number(watchedAmountPaid) || 0;
    const totalCalculated = subTotalCalculated + freightVal;
    const balanceCalculated = totalCalculated - amountPaidVal;

    setValue("subTotal", subTotalCalculated);
    setValue("total", totalCalculated);
    setValue("balance", balanceCalculated);
  }, [watchedLines, watchedFreight, watchedAmountPaid, setValue]);

  const handleProductChange = (index: number, productId: string) => {
    const matchedProduct = catalogs.products.find((p) => p.id === productId);
    if (matchedProduct) {
      setValue(`lines.${index}.unitPrice`, matchedProduct.unitPrice || 0);
    }
  };

  const onSubmit = async (values: PurchaseOrderFormData) => {
    const payload = {
      ...values,
      lines: values.lines.map((line) => ({
        ...line,
        discount: {
          value: String(line.discountValue),
          isPercent: line.discountIsPercent
        },
        quantity: {
          standardQuantity: line.quantity,
          uomQuantity: line.quantity,
          uom: line.uom
        }
      }))
    };

    try {
      const endpoint = "/api/admin/purchase-orders";
      const res = await fetch(isEditMode ? `${endpoint}/${values.id}` : endpoint, {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed parsing transaction execution sequence.");
      }

      toast.success(isEditMode ? "Purchase Order Updated" : "Purchase Order Initialized", {
        description: `Order ${values.orderNumber} successfully committed.`
      });

      startTransition(() => {
        router.push("/dashboard/purchase-orders");
        router.refresh();
      });
    } catch (error: any) {
      toast.error("Transaction Exception Raised", {
        description: error.message || "An unexpected error disrupted the database sync line."
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full text-xs font-medium space-y-6">
      <Card className="shadow-xs border-muted/80">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">
              {isEditMode ? "Modify Purchase Order Registry" : "Register Purchase Order Profile"}
            </h2>
            <p className="text-muted-foreground text-[11px]">
              Set operational parameters, line items, and fulfillment flags.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 bg-muted/30 border p-3 rounded-xl shrink-0">
            <FormSwitch
              name="isQuote"
              control={control}
              label="Quote Draft State"
              variant="inline"
            />
            <FormSwitch
              name="isTaxInclusive"
              control={control}
              label="Tax Inclusive Pricing"
              variant="inline"
            />
            <FormSwitch
              name="isCompleted"
              control={control}
              label="Completed Flag"
              variant="inline"
              className="border-l pl-4 border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" />
                Vendor & Core Order Meta
              </CardTitle>
              <CardDescription className="text-[11px]">Primary partner linkages and dates.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 pt-4">
              <FormInput
                name="orderNumber"
                control={control}
                label="PO Registry Code"
                icon={FileText}
                required
                classNameLabel="text-muted-foreground font-semibold"
              />
              <FormInput
                name="vendorOrderNumber"
                control={control}
                label="Vendor Reference Code"
                icon={FileText}
                placeholder="e.g. VEN-PO-99"
                classNameLabel="text-muted-foreground font-semibold"
              />
              <FormSelect
                name="vendorId"
                control={control}
                label="Target Vendor Entity"
                options={catalogs.vendors}
                required
                classNameLabel="text-muted-foreground font-semibold"
              />
              <FormSelect
                name="locationId"
                control={control}
                label="Receiving Warehouse / Location"
                options={catalogs.locations}
                classNameLabel="text-muted-foreground font-semibold"
              />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <FormInput
                  name="orderDate"
                  control={control}
                  type="date"
                  label="Order Date"
                  icon={Calendar}
                  classNameLabel="text-muted-foreground font-semibold"
                />
                <FormInput
                  name="dueDate"
                  control={control}
                  type="date"
                  label="Due Date"
                  icon={Calendar}
                  classNameLabel="text-muted-foreground font-semibold"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <User className="w-4 h-4 text-primary" />
                Assigned Team & Financial Catalogs
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 pt-4">
              <FormSelect
                name="assignedToTeamMemberId"
                control={control}
                label="Assigned Purchasing Agent"
                options={catalogs.teamMembers}
                classNameLabel="text-muted-foreground font-semibold"
              />
              <FormSelect
                name="approverTeamMemberId"
                control={control}
                label="Approver Team Member"
                options={catalogs.teamMembers}
                classNameLabel="text-muted-foreground font-semibold"
              />
              <FormSelect
                name="paymentTermsId"
                control={control}
                label="Payment Terms Rule"
                options={catalogs.paymentTerms}
                classNameLabel="text-muted-foreground font-semibold"
              />
              <FormSelect
                name="currencyId"
                control={control}
                label="Transaction Currency"
                options={catalogs.currencies}
                classNameLabel="text-muted-foreground font-semibold"
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-primary" />
                  Line Items Manifest
                </CardTitle>
                <CardDescription className="text-[11px]">Add required SKUs, quantities, and agreed units.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    productId: "",
                    vendorItemCode: "",
                    description: "",
                    unitPrice: 0,
                    quantity: 1,
                    uom: "PCS",
                    discountValue: 0,
                    discountIsPercent: false,
                    subTotal: 0,
                    tax1Rate: 0,
                    tax2Rate: 0
                  })
                }
                className="h-8 text-xs font-semibold gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {fields.map((field, idx) => (
                <div key={field.id} className="p-3 border rounded-xl bg-muted/20 space-y-3 relative">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <FormSelect
                        name={`lines.${idx}.productId`}
                        control={control}
                        label="Product Item"
                        options={catalogs.products}
                        required
                        classNameLabel="text-muted-foreground font-semibold"
                      />
                    </div>
                    <FormInput
                      name={`lines.${idx}.vendorItemCode`}
                      control={control}
                      label="Vendor SKU Code"
                      placeholder="Vendor Code"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name={`lines.${idx}.uom`}
                      control={control}
                      label="Unit of Measure"
                      placeholder="e.g. PCS, BOX"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <FormInput
                      name={`lines.${idx}.quantity`}
                      control={control}
                      type="number"
                      step="any"
                      label="Quantity"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name={`lines.${idx}.unitPrice`}
                      control={control}
                      type="number"
                      step="any"
                      label="Unit Price"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name={`lines.${idx}.discountValue`}
                      control={control}
                      type="number"
                      step="any"
                      label="Discount Value"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name={`lines.${idx}.subTotal`}
                      control={control}
                      type="number"
                      label="Calculated Subtotal"
                      disabled
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <div className="flex justify-end pb-1">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(idx)}
                          className="text-destructive hover:bg-destructive/10 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-primary" />
                Financial Calculations & Remarks
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-3">
                <FormInput
                  name="freight"
                  control={control}
                  type="number"
                  step="any"
                  label="Shipping & Freight Fee"
                  icon={Truck}
                  classNameLabel="text-muted-foreground font-semibold"
                />
                <FormInput
                  name="amountPaid"
                  control={control}
                  type="number"
                  step="any"
                  label="Advance Amount Paid"
                  icon={DollarSign}
                  classNameLabel="text-muted-foreground font-semibold"
                />
                <div className="p-3 bg-muted/40 rounded-xl space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Computed Subtotal:</span>
                    <span>{watch("subTotal")?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Order Total:</span>
                    <span className="text-primary font-bold">{watch("total")?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold border-t pt-1">
                    <span>Remaining Balance:</span>
                    <span className="text-amber-600 font-bold">{watch("balance")?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <FormTextarea
                  name="orderRemarks"
                  control={control}
                  label="Order Notes & Instructions"
                  placeholder="Specific vendor dispatch rules..."
                  className="min-h-[110px] text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="text-xs font-bold px-5 h-9"
              disabled={isSubmitting}
              onClick={() => router.push("/dashboard/purchase-orders")}
            >
              Cancel Transaction
            </Button>
            <Button
              type="submit"
              className="text-xs font-bold px-6 h-9 bg-slate-900 text-white hover:bg-slate-800"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Syncing System Matrices..."
                : isEditMode
                ? "Commit Operational Modifications"
                : "Initialize Account Identity"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}