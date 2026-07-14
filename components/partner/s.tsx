"use client";

import React, { startTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  Building2, User, Mail, Phone, Globe, Printer, FileText, CheckCircle2, 
  MapPin, Plus, Trash2, ShoppingBag, Truck, CreditCard, ShieldAlert 
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { businessPartnerFormSchema, type BusinessPartnerFormData } from "@/schemas/business-partner.scheme";

export interface BusinessPartnerFormProps {
  initialData?: Partial<BusinessPartnerFormData>;
  catalogs: {
    currencies: { id: string; name: string }[];
    taxingSchemes: { id: string; name: string }[];
    paymentTerms: { id: string; name: string }[];
    locations: { id: string; name: string }[];
    pricingSchemes: { id: string; name: string }[];
    salesReps: { id: string; name: string }[];
  };
}

export function BusinessPartnerForm({ initialData, catalogs }: BusinessPartnerFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData?.id;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<BusinessPartnerFormData>({
    resolver: zodResolver(businessPartnerFormSchema),
    defaultValues: {
      id: initialData?.id || "",
      name: initialData?.name || "",
      contactName: initialData?.contactName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      fax: initialData?.fax || "",
      website: initialData?.website || "",
      remarks: initialData?.remarks || "",
      isActive: initialData?.isActive ?? true,
      isCustomer: initialData?.isCustomer ?? false,
      isVendor: initialData?.isVendor ?? false,
      
      customerConfig: {
        taxExemptNumber: initialData?.customerConfig?.taxExemptNumber || "",
        defaultCarrier: initialData?.customerConfig?.defaultCarrier || "",
        defaultPaymentMethod: initialData?.customerConfig?.defaultPaymentMethod || "Cash",
        discount: initialData?.customerConfig?.discount ?? 0,
        defaultLocationId: initialData?.customerConfig?.defaultLocationId || "",
        defaultPaymentTermsId: initialData?.customerConfig?.defaultPaymentTermsId || "",
        pricingSchemeId: initialData?.customerConfig?.pricingSchemeId || "",
        taxingSchemeId: initialData?.customerConfig?.taxingSchemeId || "",
        defaultSalesRepTeamMemberId: initialData?.customerConfig?.defaultSalesRepTeamMemberId || "",
      },

      vendorConfig: {
        defaultCarrier: initialData?.vendorConfig?.defaultCarrier || "",
        defaultPaymentMethod: initialData?.vendorConfig?.defaultPaymentMethod || "Cash",
        discount: initialData?.vendorConfig?.discount ?? 0,
        isTaxInclusivePricing: initialData?.vendorConfig?.isTaxInclusivePricing ?? false,
        leadTimeDays: initialData?.vendorConfig?.leadTimeDays ?? 0,
        currencyId: initialData?.vendorConfig?.currencyId || "",
        defaultPaymentTermsId: initialData?.vendorConfig?.defaultPaymentTermsId || "",
        taxingSchemeId: initialData?.vendorConfig?.taxingSchemeId || "",
      },

      addresses: initialData?.addresses?.length ? initialData.addresses : [{
        name: "HQ Primary Branch",
        address1: "",
        address2: "",
        city: "",
        state: "",
        country: "Philippines",
        postalCode: "",
        addressType: "Commercial",
        isDefaultBilling: true,
        isDefaultShipping: true,
        isDefaultVendorAddress: true,
        remarks: ""
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses"
  });

  const isCustomer = watch("isCustomer");
  const isVendor = watch("isVendor");

  // Mutually exclusive radio logic fallback mapped gracefully across hook fields array
  const handleAddressCheckboxMutex = (
    selectedIndex: number, 
    fieldKey: "isDefaultBilling" | "isDefaultShipping" | "isDefaultVendorAddress", 
    newValue: boolean
  ) => {
    if (!newValue) return;
    fields.forEach((_, idx) => {
      if (idx !== selectedIndex) {
        setValue(`addresses.${idx}.${fieldKey}`, false);
      }
    });
  };

  const onSubmit = async (values: BusinessPartnerFormData) => {
    // Sanitize non-selected configs prior to network transit
    const payload = {
      ...values,
      customerConfig: values.isCustomer ? values.customerConfig : null,
      vendorConfig: values.isVendor ? values.vendorConfig : null,
    };

    try {
      const endpoint = "/api/admin/business-partners";
      const res = await fetch(isEditMode ? `${endpoint}/${values.id}` : endpoint, {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed parsing transaction execution sequence.");
      }

      toast.success(isEditMode ? "Master File Updated" : "Master File Initialized", {
        description: `Enterprise ledger parameters for ${values.name} successfully committed.`
      });

      startTransition(() => {
        router.push("/dashboard/business-partners");
        router.refresh();
      });
    } catch (error: any) {
      toast.error("Transaction Exception Raised", {
        description: error.message || "An unexpected error disrupted the database sync line."
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full text-xs font-medium space-y-6 max-w-7xl mx-auto">
      
      {/* Dynamic Type & State Header Card */}
      <Card className="shadow-xs border-muted/80">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">
              {isEditMode ? "Modify Business Partner Registry" : "Register Enterprise Partner Profile"}
            </h2>
            <p className="text-muted-foreground text-[11px]">
              Set global corporate metadata configurations and manage role permissions parameters.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 bg-muted/30 border p-3 rounded-xl shrink-0">
            <div className="flex items-center space-x-2">
              <Controller
                control={control}
                name="isCustomer"
                render={({ field }) => (
                  <Checkbox 
                    id="isCustomer" 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                )}
              />
              <Label htmlFor="isCustomer" className="text-xs font-bold cursor-pointer flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-blue-500" /> Customer Role
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                control={control}
                name="isVendor"
                render={({ field }) => (
                  <Checkbox 
                    id="isVendor" 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                )}
              />
              <Label htmlFor="isVendor" className="text-xs font-bold cursor-pointer flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-amber-500" /> Vendor Role
              </Label>
            </div>

            <div className="flex items-center space-x-2 border-l pl-4 border-slate-200">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch 
                    id="isActive" 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                )}
              />
              <Label htmlFor="isActive" className="text-xs font-bold cursor-pointer text-muted-foreground">
                Active State
              </Label>
            </div>
          </div>
        </CardContent>
        {errors.isCustomer && (
          <div className="px-5 pb-4 text-[11px] font-semibold text-destructive flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> {errors.isCustomer.message}
          </div>
        )}
      </Card>

      {/* Main Form Working Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Hand: Shared Base Business Partner Metrics */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" /> Core Profile Identity
              </CardTitle>
              <CardDescription className="text-[10px]">Primary legal entity name and interaction loggers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-semibold">Corporate Legal Name *</Label>
                <div className="relative">
                  <Input {...register("name")} className="text-xs font-medium pl-8" placeholder="e.g. Acme Logistics Group Inc." />
                  <Building2 className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                </div>
                {errors.name && <p className="text-destructive font-semibold text-[10px] mt-0.5">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-semibold">Primary Contact Officer</Label>
                <div className="relative">
                  <Input {...register("contactName")} className="text-xs font-medium pl-8" placeholder="e.g. Maria Santos" />
                  <User className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-semibold">Communications Email Endpoint</Label>
                <div className="relative">
                  <Input type="email" {...register("email")} className="text-xs font-medium pl-8 font-mono" placeholder="accounts@acme.com" />
                  <Mail className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                </div>
                {errors.email && <p className="text-destructive font-semibold text-[10px] mt-0.5">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-semibold">Telephone Line</Label>
                  <div className="relative">
                    <Input {...register("phone")} className="text-xs font-medium pl-8" placeholder="+63 2..." />
                    <Phone className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground font-semibold">Facsimile Network</Label>
                  <div className="relative">
                    <Input {...register("fax")} className="text-xs font-medium pl-8" placeholder="Fax Number" />
                    <Printer className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-semibold">Web Portal Domain</Label>
                <div className="relative">
                  <Input {...register("website")} className="text-xs font-medium pl-8 font-mono" placeholder="https://www.acmelogistics.com" />
                  <Globe className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                </div>
                {errors.website && <p className="text-destructive font-semibold text-[10px] mt-0.5">{errors.website.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-semibold">Administrative Annotations & Remarks</Label>
                <div className="relative">
                  <Textarea {...register("remarks")} className="text-xs font-medium min-h-[60px]" placeholder="Internal operational notes regarding this partner baseline configuration..." />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Hand Dynamic Tabs Block: Configuration Matrix & Address Logic */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Role Parameters Segment */}
          {(isCustomer || isVendor) && (
            <Tabs defaultValue={isCustomer ? "customer-segment" : "vendor-segment"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted">
                <TabsTrigger value="customer-segment" disabled={!isCustomer} className="text-xs font-bold gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" /> Customer Controls
                </TabsTrigger>
                <TabsTrigger value="vendor-segment" disabled={!isVendor} className="text-xs font-bold gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Vendor Controls
                </TabsTrigger>
              </TabsList>

              {/* Customer Parameter Form Blocks */}
              <TabsContent value="customer-segment" className="mt-4">
                <Card className="shadow-xs">
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-blue-600">
                      <CreditCard className="w-3.5 h-3.5" /> CUSTOMER FINANCIAL & SHIPPING PROTOCOLS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Tax Identification/Exempt Code</Label>
                      <Input {...register("customerConfig.taxExemptNumber")} className="text-xs font-medium" placeholder="TIN-000-000" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Default Shipping Carrier</Label>
                      <Input {...register("customerConfig.defaultCarrier")} className="text-xs font-medium" placeholder="FedEx / LBC Express" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Payment Mode Variant</Label>
                      <Input {...register("customerConfig.defaultPaymentMethod")} className="text-xs font-medium" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Pricing Scheme Matrix</Label>
                      <Controller
                        control={control}
                        name="customerConfig.pricingSchemeId"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <SelectTrigger className="text-xs font-medium h-9"><SelectValue placeholder="Select Pricing Matrix" /></SelectTrigger>
                            <SelectContent>
                              {catalogs.pricingSchemes.map((p) => <SelectItem className="text-xs" key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Customer Taxing Scheme</Label>
                      <Controller
                        control={control}
                        name="customerConfig.taxingSchemeId"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <SelectTrigger className="text-xs font-medium h-9"><SelectValue placeholder="Select Tax Model" /></SelectTrigger>
                            <SelectContent>
                              {catalogs.taxingSchemes.map((t) => <SelectItem className="text-xs" key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Grace Payment Terms</Label>
                      <Controller
                        control={control}
                        name="customerConfig.defaultPaymentTermsId"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <SelectTrigger className="text-xs font-medium h-9"><SelectValue placeholder="Select Payment Grace" /></SelectTrigger>
                            <SelectContent>
                              {catalogs.paymentTerms.map((pt) => <SelectItem className="text-xs" key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Assigned Account Fulfillment Depot</Label>
                      <Controller
                        control={control}
                        name="customerConfig.defaultLocationId"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <SelectTrigger className="text-xs font-medium h-9"><SelectValue placeholder="Select Depot Node" /></SelectTrigger>
                            <SelectContent>
                              {catalogs.locations.map((loc) => <SelectItem className="text-xs" key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Dedicated Corporate Rep</Label>
                      <Controller
                        control={control}
                        name="customerConfig.defaultSalesRepTeamMemberId"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <SelectTrigger className="text-xs font-medium h-9"><SelectValue placeholder="Assign Executive" /></SelectTrigger>
                            <SelectContent>
                              {catalogs.salesReps.map((rep) => <SelectItem className="text-xs" key={rep.id} value={rep.id}>{rep.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Standard Commercial Discount (%)</Label>
                      <Input type="number" step="0.01" {...register("customerConfig.discount")} className="text-xs font-medium h-9" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Vendor Parameter Form Blocks */}
              <TabsContent value="vendor-segment" className="mt-4">
                <Card className="shadow-xs">
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-amber-600">
                      <Truck className="w-3.5 h-3.5" /> VENDOR SUPPLY CHAIN & PROCUREMENT PROTOCOLS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Default Inbound Carrier Line</Label>
                      <Input {...register("vendorConfig.defaultCarrier")} className="text-xs font-medium" placeholder="DHL / Cargo Express" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Settlement Method</Label>
                      <Input {...register("vendorConfig.defaultPaymentMethod")} className="text-xs font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Operational Procurement Lead Time (Days)</Label>
                      <Input type="number" {...register("vendorConfig.leadTimeDays")} className="text-xs font-medium" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Base Currency Ledger</Label>
                      <Controller
                        control={control}
                        name="vendorConfig.currencyId"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <SelectTrigger className="text-xs font-medium h-9"><SelectValue placeholder="Select Currency" /></SelectTrigger>
                            <SelectContent>
                              {catalogs.currencies.map((curr) => <SelectItem className="text-xs" key={curr.id} value={curr.id}>{curr.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Vendor Outbound Tax Model</Label>
                      <Controller
                        control={control}
                        name="vendorConfig.taxingSchemeId"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <SelectTrigger className="text-xs font-medium h-9"><SelectValue placeholder="Select Tax Matrix" /></SelectTrigger>
                            <SelectContent>
                              {catalogs.taxingSchemes.map((t) => <SelectItem className="text-xs" key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Outbound Payable Grace Terms</Label>
                      <Controller
                        control={control}
                        name="vendorConfig.defaultPaymentTermsId"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <SelectTrigger className="text-xs font-medium h-9"><SelectValue placeholder="Select Payment Terms" /></SelectTrigger>
                            <SelectContent>
                              {catalogs.paymentTerms.map((pt) => <SelectItem className="text-xs" key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Global Purchasing Discount (%)</Label>
                      <Input type="number" step="0.01" {...register("vendorConfig.discount")} className="text-xs font-medium h-9" />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between border rounded-lg p-2.5 mt-5 bg-muted/20">
                      <div className="space-y-0.5">
                        <Label htmlFor="v-tax-inc" className="text-xs font-bold cursor-pointer">Tax-Inclusive Pricing Policy</Label>
                        <p className="text-[10px] text-muted-foreground">Automatically bundle structural system taxes straight inside cost rates.</p>
                      </div>
                      <Controller
                        control={control}
                        name="vendorConfig.isTaxInclusivePricing"
                        render={({ field }) => (
                          <Switch id="v-tax-inc" checked={field.value} onCheckedChange={field.onChange} />
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Dynamic Address Relational Matrix Block */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" /> Physical Mapping Coordinates Matrix
                </CardTitle>
                <CardDescription className="text-[10px]">Configure spatial deployment nodes, shipping markers, and tax profiles.</CardDescription>
              </div>
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                className="text-[11px] font-bold gap-1 h-8"
                onClick={() => append({
                  name: `Branch Terminal ${fields.length + 1}`,
                  address1: "", address2: "", city: "", state: "", country: "Philippines", postalCode: "",
                  addressType: "Commercial", isDefaultBilling: false, isDefaultShipping: false, isDefaultVendorAddress: false, remarks: ""
                })}
              >
                <Plus className="w-3.5 h-3.5" /> Append Coordinate Row
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 bg-muted/30 border rounded-xl relative space-y-4 font-medium">
                  
                  {/* Row Header Controls Container */}
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-slate-700 font-mono text-[11px]">Location Node Mapping Vector #{index + 1}</span>
                    {fields.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10 text-[10px] font-bold gap-1 h-7 px-2"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Drop Point
                      </Button>
                    )}
                  </div>

                  {/* Address Grid Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Address Label Name *</Label>
                      <Input {...register(`addresses.${index}.name`)} placeholder="e.g. Warehouse 3 Dock B" className="text-xs font-medium" />
                      {errors.addresses?.[index]?.name && <p className="text-destructive text-[10px] font-bold">{errors.addresses[index].name?.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Street Line 1 *</Label>
                      <Input {...register(`addresses.${index}.address1`)} placeholder="Building, Street, Industrial Zone" className="text-xs font-medium" />
                      {errors.addresses?.[index]?.address1 && <p className="text-destructive text-[10px] font-bold">{errors.addresses[index].address1?.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Line 2 (Suite/Floor)</Label>
                      <Input {...register(`addresses.${index}.address2`)} placeholder="Apartment, unit, etc." className="text-xs font-medium" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">City Terminal *</Label>
                      <Input {...register(`addresses.${index}.city`)} placeholder="City" className="text-xs font-medium" />
                      {errors.addresses?.[index]?.city && <p className="text-destructive text-[10px] font-bold">{errors.addresses[index].city?.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">State / Province *</Label>
                      <Input {...register(`addresses.${index}.state`)} placeholder="Region / State" className="text-xs font-medium" />
                      {errors.addresses?.[index]?.state && <p className="text-destructive text-[10px] font-bold">{errors.addresses[index].state?.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground font-semibold">Postal Code *</Label>
                        <Input {...register(`addresses.${index}.postalCode`)} placeholder="ZIP" className="text-xs font-medium font-mono" />
                        {errors.addresses?.[index]?.postalCode && <p className="text-destructive text-[10px] font-bold">{errors.addresses[index].postalCode?.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-muted-foreground font-semibold">Node Classification</Label>
                        <Controller
                          control={control}
                          name={`addresses.${index}.addressType`}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <SelectTrigger className="text-xs font-medium h-9"><SelectValue placeholder="Type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem className="text-xs" value="Commercial">Commercial</SelectItem>
                                <SelectItem className="text-xs" value="Residential">Residential</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:col-span-1">
                      <Label className="text-muted-foreground font-semibold">Country Anchor Designation *</Label>
                      <Input {...register(`addresses.${index}.country`)} className="text-xs font-medium" />
                      {errors.addresses?.[index]?.country && <p className="text-destructive text-[10px] font-bold">{errors.addresses[index].country?.message}</p>}
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-muted-foreground font-semibold">Site Specific Instructions</Label>
                      <Input {...register(`addresses.${index}.remarks`)} placeholder="e.g., Forklift access available, deliver to gate 4" className="text-xs font-medium" />
                    </div>
                  </div>

                  {/* Mutually Exclusive Status Flag Matrix Sub-Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-dashed">
                    {isCustomer && (
                      <>
                        <div className="flex items-center space-x-2">
                          <Controller
                            control={control}
                            name={`addresses.${index}.isDefaultBilling`}
                            render={({ field }) => (
                              <Checkbox 
                                id={`billing-${index}`} 
                                checked={field.value} 
                                onCheckedChange={(val) => {
                                  field.onChange(val);
                                  handleAddressCheckboxMutex(index, "isDefaultBilling", !!val);
                                }} 
                              />
                            )}
                          />
                          <Label htmlFor={`billing-${index}`} className="text-[11px] text-slate-600 font-bold cursor-pointer">
                            Default Customer Billing Node
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Controller
                            control={control}
                            name={`addresses.${index}.isDefaultShipping`}
                            render={({ field }) => (
                              <Checkbox 
                                id={`shipping-${index}`} 
                                checked={field.value} 
                                onCheckedChange={(val) => {
                                  field.onChange(val);
                                  handleAddressCheckboxMutex(index, "isDefaultShipping", !!val);
                                }} 
                              />
                            )}
                          />
                          <Label htmlFor={`shipping-${index}`} className="text-[11px] text-slate-600 font-bold cursor-pointer">
                            Default Customer Shipping Anchor
                          </Label>
                        </div>
                      </>
                    )}

                    {isVendor && (
                      <div className="flex items-center space-x-2">
                        <Controller
                          control={control}
                          name={`addresses.${index}.isDefaultVendorAddress`}
                          render={({ field }) => (
                            <Checkbox 
                              id={`vendor-addr-${index}`} 
                              checked={field.value} 
                              onCheckedChange={(val) => {
                                field.onChange(val);
                                handleAddressCheckboxMutex(index, "isDefaultVendorAddress", !!val);
                              }} 
                            />
                          )}
                        />
                        <Label htmlFor={`vendor-addr-${index}`} className="text-[11px] text-slate-600 font-bold cursor-pointer">
                          Default Procurement Order Node
                        </Label>
                      </div>
                    )}
                  </div>

                </div>
              ))}
              {errors.addresses?.message && (
                <p className="text-destructive font-bold text-center text-xs">{errors.addresses.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Form Action Controls Bar */}
          <div className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="text-xs font-bold px-5 h-9" 
              disabled={isSubmitting}
              onClick={() => router.push("/dashboard/business-partners")}
            >
              Cancel Transaction
            </Button>
            <Button 
              type="submit" 
              className="text-xs font-bold px-6 h-9 bg-slate-900 text-white hover:bg-slate-800"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Syncing System Matrices..." : isEditMode ? "Commit Operational Modifications" : "Initialize Account Identity"}
            </Button>
          </div>

        </div>
      </div>
    </form>
  );
}