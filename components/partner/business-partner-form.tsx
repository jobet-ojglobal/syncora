"use client";

import React, { startTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  Building2, User, Mail, Phone, Globe, Printer, FileText, CheckCircle2, 
  MapPin, Plus, Trash2, ShoppingBag, Truck, CreditCard, ShieldAlert, ClipboardList
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
import { FormSelect } from "../shared/form-select";
import { FormInput } from "../shared/form-input";
import { FormSwitch } from "../shared/form-switch";
import { FormTextarea } from "../shared/form-textarea";
import { FormCheckbox } from "../shared/form-checkbox";
import { FormMultiSelect } from "../shared/form-multiple-select";

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

      locations: initialData?.locations?.length ? initialData.locations : [],

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
    <form onSubmit={handleSubmit(onSubmit)} className="w-full text-xs font-medium space-y-6 ">
      
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
            <FormCheckbox
              name="isCustomer"
              control={control}
              label="Customer Role"
              icon={ShoppingBag}
              iconClassName="text-blue-500"
            />
            <FormCheckbox
              name="isVendor"
              control={control}
              label="Vendor Role"
              icon={Truck}
              iconClassName="text-amber-500"
            />
            <FormSwitch
              name="isActive"
              control={control}
              label="Active State"
              variant="inline"
              className="border-l pl-4 border-slate-200"
            />
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
            <CardHeader className="border-b ">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" /> 
                Core Profile Identity
              </CardTitle>
              <CardDescription className="text-[11px]">Primary legal entity name and interaction loggers.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <FormInput
                name="name"
                control={control}
                label="Corporate Legal Name"
                icon={Building2}
                required
                placeholder="e.g. Acme Logistics Group Inc."
                classNameLabel="text-muted-foreground font-semibold"
              />
              <FormInput
                name="contactName"
                control={control}
                label="Primary Contact Officer"
                icon={User}
                placeholder="e.g. Maria Santos"
                classNameLabel="text-muted-foreground font-semibold"
              />
              <FormInput
                name="email"
                control={control}
                label="Communications Email Endpoint"
                icon={User}
                type="email"
                placeholder="accounts@acme.com"
                classNameLabel="text-muted-foreground font-semibold"
              />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <FormInput
                  name="phone"
                  control={control}
                  label="Telephone Line"
                  icon={User}
                  placeholder="+63 2..."
                  classNameLabel="text-muted-foreground font-semibold"
                />
                <FormInput
                  name="fax"
                  control={control}
                  label="Facsimile Network"
                  icon={User}
                  placeholder="Fax Number"
                  classNameLabel="text-muted-foreground font-semibold"
                />
              </div>

              <FormInput
                name="website"
                control={control}
                label="Web Portal Domain"
                icon={Globe}
                placeholder="https://www.acmelogistics.com"
                classNameLabel="text-muted-foreground font-semibold"
              />

              <FormMultiSelect
                name="locations"
                control={control}
                options={catalogs.locations}
                label="Local Department Placements"
                placeholder="Choose placements..."
                searchPlaceholder="Search departments..."
                loading={false}
                classNameLabel="text-muted-foreground font-semibold"
              />

              <FormTextarea
                name="remarks"
                control={control}
                label="Administrative Annotations & Remarks"
                placeholder="Internal operational notes regarding this partner baseline configuration..."
                className="min-h-[80px] text-xs"
              />
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
                  <CardHeader className="border-b text-blue-500">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-primary" /> 
                      Customer Financial & Shipping Protocols
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                    <FormInput
                      name="customerConfig.taxExemptNumber"
                      control={control}
                      label="Tax Identification/Exempt Code"
                      placeholder="TIN-000-000"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name="customerConfig.defaultCarrier"
                      control={control}
                      label="Default Shipping Carrier"
                      placeholder="Flash / LBC Express"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name="customerConfig.defaultPaymentMethod"
                      control={control}
                      label="Payment Mode Variant"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormSelect
                      name="customerConfig.pricingSchemeId"
                      control={control}
                      label="Pricing Scheme Matrix"
                      placeholder="Select Pricing Matrix"
                      options={catalogs.pricingSchemes}
                      emptyMessage="No pricing schemes available"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormSelect
                      name="customerConfig.taxingSchemeId"
                      control={control}
                      label="Customer Taxing Scheme"
                      placeholder="Select Tax Model"
                      options={catalogs.taxingSchemes}
                      emptyMessage="No taxing schemes available"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormSelect
                      name="customerConfig.defaultPaymentTermsId"
                      control={control}
                      label="Payment Terms"
                      placeholder="Select Payment Term"
                      options={catalogs.paymentTerms}
                      emptyMessage="No payment terms available"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormSelect
                      name="customerConfig.defaultLocationId"
                      control={control}
                      label="Assigned Account Fulfillment Depot"
                      placeholder="Select Depot Node"
                      options={catalogs.locations}
                      emptyMessage="No locations available"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    
                    <FormSelect
                      name="customerConfig.defaultSalesRepTeamMemberId"
                      control={control}
                      label="Assigned Account Fulfillment Depot"
                      placeholder="Assign Executive"
                      options={catalogs.salesReps}
                      emptyMessage="No sales rep available"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name="customerConfig.discount"
                      control={control}
                      label="Standard Commercial Discount (%)"
                      step="0.01"
                      type="number"
                      placeholder="0.00"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Vendor Parameter Form Blocks */}
              <TabsContent value="vendor-segment" className="mt-4">
                <Card className="shadow-xs">
                  <CardHeader className="border-b text-amber-600">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-primary" /> 
                      Vendor Supply Chain & Procurement Protocols
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                    <FormInput
                      name="vendorConfig.defaultCarrier"
                      control={control}
                      label="Default Inbound Carrier Line"
                      placeholder="Lalamove / Cargo Express"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name="vendorConfig.defaultPaymentMethod"
                      control={control}
                      label="Settlement Method"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name="vendorConfig.leadTimeDays"
                      control={control}
                      type="number"
                      label="Operational Procurement Lead Time (Days)"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormSelect
                      name="vendorConfig.currencyId"
                      control={control}
                      label="Base Currency Ledger"
                      placeholder="Select Currency"
                      options={catalogs.currencies}
                      emptyMessage="No currencies available"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    
                    <FormSelect
                      name="vendorConfig.taxingSchemeId"
                      control={control}
                      label="Vendor Outbound Tax Model"
                      placeholder="Select Tax Matrix"
                      options={catalogs.taxingSchemes}
                      emptyMessage="No taxing schemes available"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormSelect
                      name="vendorConfig.defaultPaymentTermsId"
                      control={control}
                      label="Payment Term"
                      placeholder="Select Payment Terms"
                      options={catalogs.paymentTerms}
                      emptyMessage="No payment terms available"
                      classNameLabel="text-muted-foreground font-semibold"
                    />

                    <FormInput
                      name="vendorConfig.discount"
                      control={control}
                      label="Global Purchasing Discount (%)"
                      step="0.01"
                      type="number"
                      placeholder="0.00"
                      classNameLabel="text-muted-foreground font-semibold"
                    />

                    <FormSwitch
                      name="vendorConfig.isTaxInclusivePricing"
                      control={control}
                      label="Tax-Inclusive Pricing Policy"
                      variant="card"
                      description="Controls transactional accessibility."
                      className="sm:col-span-2 p-2.5"
                    />
                    
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Dynamic Address Relational Matrix Block */}
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" /> 
                  Physical Mapping Coordinates Matrix
                </CardTitle>
                <CardDescription className="text-[11px]">Configure spatial deployment nodes, shipping markers, and tax profiles.</CardDescription>
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
            <CardContent className="space-y-6" >
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
                    <FormInput
                      name={`addresses.${index}.name`}
                      control={control}
                      label="Address Label Name"
                      required
                      placeholder="e.g. Warehouse 3 Dock B"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    
                    <FormInput
                      name={`addresses.${index}.address1`}
                      control={control}
                      label="Street Line 1"
                      required
                      placeholder="Building, Street, Industrial Zone"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name={`addresses.${index}.address2`}
                      control={control}
                      label="Line 2 (Suite/Floor)"
                      placeholder="Apartment, unit, etc."
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name={`addresses.${index}.city`}
                      control={control}
                      label="City Terminal"
                      required
                      placeholder="City"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name={`addresses.${index}.state`}
                      control={control}
                      label="State / Province"
                      required
                      placeholder="Region / State"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name={`addresses.${index}.postalCode`}
                      control={control}
                      label="Postal Code"
                      required
                      placeholder="ZIP"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormInput
                      name={`addresses.${index}.country`}
                      control={control}
                      label="Country Anchor Designation"
                      required
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormSelect
                      name={`addresses.${index}.addressType`}
                      control={control}
                      label="Node Classification"
                      placeholder="Type"
                      options={[{ id: "Commercial", name: "Commercial" }, { id: "Residential", name: "Residential" }]}
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                    <FormTextarea
                      name={`addresses.${index}.remarks`}
                      control={control}
                      label="Site Specific Instructions"
                      placeholder="e.g., Forklift access available, deliver to gate 4"
                      className="min-h-[80px] text-xs "
                      classNameLabel="text-muted-foreground font-semibold "
                      classNameField="sm:col-span-3"
                    />

                   
                  </div>

                  {/* Mutually Exclusive Status Flag Matrix Sub-Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-dashed">
                    {isCustomer && (
                      <>
                        {/* Dynamic Billing Form Selector Grid Context */}
                        <FormCheckbox
                          name={`addresses.${index}.isDefaultBilling`}
                          control={control}
                          label="Default Customer Billing Node"
                          icon={CreditCard}
                          iconClassName="text-blue-500"
                          onChange={(checked) => 
                            handleAddressCheckboxMutex(index, "isDefaultBilling", checked)
                          }
                        />

                        {/* Dynamic Shipping Form Selector Grid Context */}
                        <FormCheckbox
                          name={`addresses.${index}.isDefaultShipping`}
                          control={control}
                          label="Default Customer Shipping Anchor"
                          icon={Truck}
                          iconClassName="text-indigo-500"
                          onChange={(checked) => 
                            handleAddressCheckboxMutex(index, "isDefaultShipping", checked)
                          }
                        />
                      </>
                    )}

                    {isVendor && (
                      /* Dynamic Vendor Procurement Selector Panel Context */
                      <FormCheckbox
                        name={`addresses.${index}.isDefaultVendorAddress`}
                        control={control}
                        label="Default Procurement Order Node"
                        icon={ClipboardList}
                        iconClassName="text-amber-500"
                        onChange={(checked) => 
                          handleAddressCheckboxMutex(index, "isDefaultVendorAddress", checked)
                        }
                      />
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



// "use client";

// import { useRouter } from "next/navigation";
// import { useForm, Controller, type SubmitHandler, useFieldArray } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { 
//   Building2, User, Mail, Phone, MapPin, Landmark, 
//   Save, ArrowLeft, Loader2, Globe, Briefcase, Percent, Edit3,
//   AlertCircle,
//   Hash
// } from "lucide-react";
// import Link from "next/link";
// import { toast } from "sonner";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Switch } from "@/components/ui/switch";
// import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Field, FieldLabel, FieldError, FieldContent, FieldGroup } from "@/components/ui/field";

// import { customerFormSchema, CustomerFormData } from "@/schemas/customer.schema";

// interface UnifiedCustomerFormProps {
//   initialData?: Partial<CustomerFormData>;
//   catalogs: {
//     pricing: { id: string; name: string }[];
//     taxing: { id: string; name: string }[];
//     terms: { id: string; name: string }[];
//     locations: { id: string; name: string }[];
//     reps: { id: string; name: string }[];
//   };
// }

// export default function UnifiedBusinessPartnerForm({ initialData, catalogs }: UnifiedCustomerFormProps) {
//   const router = useRouter();
//   const isEditMode = !!initialData;

//   const { 
//     register, 
//     handleSubmit, 
//     control, 
//     watch, 
//     setValue, 
//     formState: { errors, isSubmitting } 
//   } = useForm<CustomerFormData>({
//     resolver: zodResolver(customerFormSchema) as any,
//     defaultValues: {
//       id: initialData?.id || "",
//       name: initialData?.name || "",
//       contactName: initialData?.contactName || "",
//       email: initialData?.email || "",
//       phone: initialData?.phone || "",
//       website: initialData?.website || "",
//       isActive: initialData?.isActive ?? true,
//       remarks: initialData?.remarks || "",
//       fax: initialData?.fax || "",
//       discount: initialData?.discount ?? 0,
//       taxExemptNumber: initialData?.taxExemptNumber || "",
//       defaultCarrier: initialData?.defaultCarrier || "",
//       defaultPaymentMethod: initialData?.defaultPaymentMethod || "Cash",
//       defaultLocationId: initialData?.defaultLocationId || "",
//       defaultPaymentTermsId: initialData?.defaultPaymentTermsId || "",
//       pricingSchemeId: initialData?.pricingSchemeId || "",
//       taxingSchemeId: initialData?.taxingSchemeId || "",
//       defaultSalesRepTeamMemberId: initialData?.defaultSalesRepTeamMemberId || "",
//       addresses: initialData?.addresses || [{
//         name: "Home Office", 
//         address1: "",
//         address2: "",
//         city: "",
//         state: "", // Critical schema fix: ensure this is present
//         country: "Philippines",
//         postalCode: "",
//         addressType: null,
//         isDefaultBilling: true,
//         isDefaultShipping: true,
//         remarks: ""
//       }],
//     },
//   });

//   const { fields, append, remove } = useFieldArray({
//     control,
//     name: "addresses"
//   });

//   const onSubmit = async (values: CustomerFormData) => {
//     try {
//       const res = await fetch("/api/admin/customers", {
//         method: isEditMode ? "PATCH" : "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(values)
//       });

//       if (!res.ok) {
//         const errorData = await res.json().catch(() => ({}));
//         throw new Error(errorData.message || "Failed to commit customer record.");
//       }

//       toast.success(isEditMode ? "Record Updated" : "Record Created", {
//         description: isEditMode 
//           ? "The customer ledger has been successfully modified." 
//           : "A new customer profile has been initialized."
//       });

//       router.push("/dashboard/customers");
//       router.refresh();
//     } catch (error: any) {
//       toast.error("Operation Denied", { 
//         description: error.message || "An unexpected error occurred during submission." 
//       });
//     } 
//   };

//   const handleDefaultChange = (
//     selectedIndex: number, 
//     fieldToUpdate: "isDefaultBilling" | "isDefaultShipping", 
//     newValue: boolean
//   ) => {
//     if (!newValue) return;

//     // Updates state safely across all fields using clean loop indexing via hook primitives
//     fields.forEach((_, index) => {
//       if (index !== selectedIndex) {
//         setValue(`addresses.${index}.${fieldToUpdate}`, false);
//       }
//     });
//   };

//   return ( 
//     <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 ">
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
//         {/* Left Column */}
//         <div className="space-y-6">
//           {/* Core Profile */}
//           <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
//             <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
//               <Building2 className="w-4 h-4 text-primary" /> Corporate Entity Information
//             </h2>
//             <Controller
//               name="name"
//               control={control}
//               render={({ field, fieldState }) => (
//                 <Field data-invalid={fieldState.invalid}>
//                   <FieldLabel htmlFor="form-name">
//                     Registered Business Legal Name <b className="text-red-500">*</b>
//                   </FieldLabel>
//                   <Input
//                     {...field}
//                     id="form-name"
//                     aria-invalid={fieldState.invalid}
//                     placeholder=""
//                   />
//                   {fieldState.invalid && (
//                     <FieldError errors={[fieldState.error]} />
//                   )}
//                 </Field>
//               )}
//             />
//             <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//               <Controller
//                 name="contactName"
//                 control={control}
//                 render={({ field, fieldState }) => (
//                   <Field data-invalid={fieldState.invalid}>
//                     <FieldLabel htmlFor="form-contactName">
//                       Primary Contact <b className="text-red-500">*</b>
//                     </FieldLabel>
//                     <FieldContent className="relative">
//                       <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
//                       <Input
//                         {...field}
//                         id="form-contactName"
//                         aria-invalid={fieldState.invalid}
//                         placeholder=""
//                         className="pl-9 h-9 text-xs" 
//                       />
//                     </FieldContent>
//                     {fieldState.invalid && (
//                       <FieldError errors={[fieldState.error]} />
//                     )}
//                   </Field>
//                 )}
//               />
//               <Controller
//                 name="website"
//                 control={control}
//                 render={({ field, fieldState }) => (
//                   <Field data-invalid={fieldState.invalid}>
//                     <FieldLabel htmlFor="form-website">
//                       Corporate Website 
//                     </FieldLabel>
//                     <FieldContent className="relative">
//                       <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
//                       <Input
//                         {...field}
//                         id="form-website"
//                         aria-invalid={fieldState.invalid}
//                         placeholder="https://"
//                         className="pl-9 h-9 text-xs" 
//                       />
//                     </FieldContent>
//                     {fieldState.invalid && (
//                       <FieldError errors={[fieldState.error]} />
//                     )}
//                   </Field>
//                 )}
//               />
//             </FieldGroup>
//             <FieldGroup className="grid grid-cols-1 sm:grid-cols-3 gap-3">
//               <Controller
//                 name="email"
//                 control={control}
//                 render={({ field, fieldState }) => (
//                   <Field data-invalid={fieldState.invalid}>
//                     <FieldLabel htmlFor="form-email">
//                       Billing Email 
//                     </FieldLabel>
//                     <FieldContent className="relative">
//                       <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
//                       <Input
//                         {...field}
//                         id="form-email"
//                         aria-invalid={fieldState.invalid}
//                         placeholder=""
//                         className="pl-9 h-9 text-xs" 
//                       />
//                     </FieldContent>
//                     {fieldState.invalid && (
//                       <FieldError errors={[fieldState.error]} />
//                     )}
//                   </Field>
//                 )}
//               />
//               <Controller
//                 name="phone"
//                 control={control}
//                 render={({ field, fieldState }) => (
//                   <Field data-invalid={fieldState.invalid}>
//                     <FieldLabel htmlFor="form-phone">
//                       Phone Number <b className="text-red-500">*</b>
//                     </FieldLabel>
//                     <FieldContent className="relative">
//                       <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
//                       <Input
//                         {...field}
//                         id="form-phone"
//                         aria-invalid={fieldState.invalid}
//                         placeholder=""
//                         className="pl-9 h-9 text-xs" 
//                       />
//                     </FieldContent>
//                     {fieldState.invalid && (
//                       <FieldError errors={[fieldState.error]} />
//                     )}
//                   </Field>
//                 )}
//               />
//               <Controller
//                 name="fax"
//                 control={control}
//                 render={({ field, fieldState }) => (
//                   <Field data-invalid={fieldState.invalid}>
//                     <FieldLabel htmlFor="form-fax">
//                       Fax Number 
//                     </FieldLabel>
//                       <FieldContent className="relative">
//                       <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
//                       <Input
//                         {...field}
//                         id="form-fax"
//                         aria-invalid={fieldState.invalid}
//                         placeholder=""
//                         className="pl-9 h-9 text-xs" 
//                       />
//                     </FieldContent>
//                     {fieldState.invalid && (
//                       <FieldError errors={[fieldState.error]} />
//                     )}
//                   </Field>
//                 )}
//               />
//             </FieldGroup>
//             <Field className="lg:col-span-3">
//               <div className="border rounded-lg bg-muted/20 p-4 min-h-[74px] flex justify-between items-center gap-4">
//                 <div className="space-y-0.5">
//                   <p className="text-sm font-semibold text-foreground">Account Status</p>
//                   <p className="text-xs text-muted-foreground leading-normal">Controls transactional accessibility.</p>
//                 </div>
//                 <Switch
//                   className="shrink-0"
//                   checked={watch("isActive")}
//                   onCheckedChange={(value) => setValue("isActive", value)}
//                 />
//               </div>
//             </Field>
//           </div>

//           {/* Operations & Logistics */}
//           <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
//             <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
//               <Briefcase className="w-4 h-4 text-primary" /> Operations & Fulfillment
//             </h2>

//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//               <Field>
//                 <FieldLabel>Default Dispatch Location</FieldLabel>
//                 <Controller
//                   control={control}
//                   name="defaultLocationId"
//                   render={({ field, fieldState }) => (
//                     <>
//                       <Select onValueChange={field.onChange} value={field.value}>
//                         <SelectTrigger>
//                           <SelectValue placeholder="Select Warehouse" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {catalogs.locations.length > 0 ? (
//                             catalogs.locations.map((cat) => (
//                               <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
//                             ))
//                           ) : (
//                             <SelectItem value="0" disabled>No locations available</SelectItem>
//                           )}
//                         </SelectContent>
//                       </Select>
//                       {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
//                     </>
//                   )}
//                 />
//               </Field>

//               <Field>
//                 <FieldLabel>Default Shipping Carrier</FieldLabel>
//                 <FieldContent>
//                   <Input placeholder="e.g. FedEx Ground" className="h-9 text-xs" {...register("defaultCarrier")} />
//                 </FieldContent>
//               </Field>
//             </div>
            
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//               <Field>
//                 <FieldLabel>Assigned Sales Representative</FieldLabel>
//                 <Controller
//                   control={control}
//                   name="defaultSalesRepTeamMemberId"
//                   render={({ field, fieldState }) => (
//                     <>
//                       <Select onValueChange={field.onChange} value={field.value}>
//                         <SelectTrigger>
//                           <SelectValue placeholder="Select Representative" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {catalogs.reps.length > 0 ? (
//                             catalogs.reps.map((cat) => (
//                               <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
//                             ))
//                           ) : (
//                             <SelectItem value="0" disabled>No sales representatives available</SelectItem>
//                           )}
//                         </SelectContent>
//                       </Select>
//                       {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
//                     </>
//                   )}
//                 />
//               </Field>
//             </div>
//           </div>

//           {/* Additional Remarks */}
//           <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs hidden sm:block">
//             <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
//               <Edit3 className="w-4 h-4 text-primary" /> Additional Remarks
//             </h2>
//             <Controller
//               name="remarks"
//               control={control}
//               render={({ field, fieldState }) => (
//                 <Field data-invalid={fieldState.invalid}>
//                   <FieldLabel htmlFor="form-remarks">Notes / Comments</FieldLabel>
//                   <Textarea
//                     {...field}
//                     id="form-remarks"
//                     aria-invalid={fieldState.invalid}
//                     placeholder="Optional"
//                     className="min-h-[120px]"
//                   />
//                   {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                 </Field>
//               )}
//             />
//           </div>
//         </div>

//         {/* Right Column */}
//         <div className="space-y-6">
//           {/* Financial Account Settings */}
//           <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
//             <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
//               <Landmark className="w-4 h-4 text-primary" /> Financial Governance
//             </h2>

//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//               <Controller
//                 name="pricingSchemeId"
//                 control={control}
//                 render={({ field, fieldState }) => (
//                   <Field data-invalid={fieldState.invalid}>
//                     <FieldLabel htmlFor="form-pricingScheme">
//                       Pricing Scheme <b className="text-red-500">*</b>
//                     </FieldLabel>
//                     <FieldContent className="relative">
//                       <Select
//                         name={field.name}
//                         value={field.value ?? ""}
//                         onValueChange={(val) => field.onChange(val === "null" ? "" : val)} 
//                       >
//                         <SelectTrigger
//                           id="form-pricingScheme"
//                           aria-invalid={fieldState.invalid}
//                           className="w-full"
//                         >
//                           <SelectValue placeholder="Select" />
//                         </SelectTrigger>
//                         <SelectContent position="item-aligned">
//                           { catalogs.pricing.length > 0 ? (
//                             catalogs.pricing.map((val) => (
//                               <SelectItem key={val.id} value={val.id}>
//                                 {val.name}
//                               </SelectItem>
//                             )))
//                           : (
//                             <SelectItem value="null">No pricing scheme available</SelectItem>
//                           )}
//                         </SelectContent>
//                       </Select>
//                     </FieldContent>
//                     {fieldState.invalid && (
//                       <FieldError errors={[fieldState.error]} />
//                     )}
//                   </Field>
//                 )}
//               />

//               <Controller
//                 name="taxingSchemeId"
//                 control={control}
//                 render={({ field, fieldState }) => (
//                   <Field data-invalid={fieldState.invalid}>
//                     <FieldLabel htmlFor="form-taxingScheme">
//                       Taxing Scheme <b className="text-red-500">*</b>
//                     </FieldLabel>
//                     <FieldContent className="relative">
//                       <Select
//                         name={field.name}
//                         value={field.value ?? ""}
//                         onValueChange={(val) => field.onChange(val === "null" ? "" : val)} 
//                       >
//                         <SelectTrigger
//                           id="form-taxingScheme"
//                           aria-invalid={fieldState.invalid}
//                           className="w-full"
//                         >
//                           <SelectValue placeholder="Select" />
//                         </SelectTrigger>
//                         <SelectContent position="item-aligned">
//                           { catalogs.taxing.length > 0 ? (
//                             catalogs.taxing.map((val) => (
//                               <SelectItem key={val.id} value={val.id}>
//                                 {val.name}
//                               </SelectItem>
//                             )))
//                           : (
//                             <SelectItem value="null">No taxing scheme available</SelectItem>
//                           )}
//                         </SelectContent>
//                       </Select>
//                     </FieldContent>
//                     {fieldState.invalid && (
//                       <FieldError errors={[fieldState.error]} />
//                     )}
//                   </Field>
//                 )}
//               />
//             </div>

//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//               <Controller
//                 name="defaultPaymentTermsId"
//                 control={control}
//                 render={({ field, fieldState }) => (
//                   <Field data-invalid={fieldState.invalid}>
//                     <FieldLabel htmlFor="form-defaultPaymentTerms">
//                       Payment Term 
//                     </FieldLabel>
//                     <FieldContent className="relative">
//                       <Select
//                         name={field.name}
//                         value={field.value ?? ""}
//                         onValueChange={(val) => field.onChange(val === "null" ? "" : val)} 
//                       >
//                         <SelectTrigger
//                           id="form-defaultPaymentTerms"
//                           aria-invalid={fieldState.invalid}
//                           className="w-full"
//                         >
//                           <SelectValue placeholder="Select" />
//                         </SelectTrigger>
//                         <SelectContent position="item-aligned">
//                           { catalogs.terms.length > 0 ? (
//                             catalogs.terms.map((val) => (
//                               <SelectItem key={val.id} value={val.id}>
//                                 {val.name}
//                               </SelectItem>
//                             )))
//                           : (
//                             <SelectItem value="null">No payment term available</SelectItem>
//                           )}
//                         </SelectContent>
//                       </Select>
//                     </FieldContent>
//                     {fieldState.invalid && (
//                       <FieldError errors={[fieldState.error]} />
//                     )}
//                   </Field>
//                 )}
//               />

//               <Controller
//                 name="defaultPaymentMethod"
//                 control={control}
//                 render={({ field, fieldState }) => (
//                   <Field data-invalid={fieldState.invalid}>
//                     <FieldLabel htmlFor="form-defaultPaymentMethod">
//                       Payment Method <b className="text-red-500">*</b>
//                     </FieldLabel>
//                     <FieldContent className="relative">
//                       <Select
//                         name={field.name}
//                         value={field.value ?? ""}
//                         onValueChange={(val) => field.onChange(val === "null" ? "" : val)} 
//                       >
//                         <SelectTrigger
//                           id="form-defaultPaymentMethod"
//                           aria-invalid={fieldState.invalid}
//                           className="w-full"
//                         >
//                           <SelectValue placeholder="Select" />
//                         </SelectTrigger>
//                         <SelectContent position="item-aligned">
//                           {["Cash", "Online Payment", "Cheque", "Master Card", "VISA"].map((method) => (
//                             <SelectItem key={method} value={method} className="text-xs">{method}</SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </FieldContent>
//                     {fieldState.invalid && (
//                       <FieldError errors={[fieldState.error]} />
//                     )}
//                   </Field>
//                 )}
//               />
//             </div>

//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//               <Field>
//                 <FieldLabel>Tax Exempt / VAT ID</FieldLabel>
//                 <FieldContent><Input placeholder="Optional" className="h-9 text-xs" {...register("taxExemptNumber")} /></FieldContent>
//                 {errors.taxExemptNumber && <FieldError>{errors.taxExemptNumber.message}</FieldError>}
//               </Field>

//               <Field>
//                 <FieldLabel>Standing Discount Rate</FieldLabel>
//                 <FieldContent>
//                   <div className="relative">
//                     <Percent className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
//                     <Input type="number" min="0" max="100" step="0.1" className="pl-9 h-9 text-xs" {...register("discount")} />
//                   </div>
//                 </FieldContent>
//                 {errors.discount && <FieldError>{errors.discount.message}</FieldError>}
//               </Field>
//             </div>
//           </div>

//           {/* Managed Addresses */}
//           <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
//             <div className="flex flex-col space-y-2">
//               <div className="flex items-center justify-between">
//                 <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
//                   <MapPin className="w-4 h-4 text-primary" /> Managed Addresses
//                 </h2>
//               </div>

//               {/* CUSTOM ERROR ALERT FOR ADDRESSES ARRAY */}
//               {errors.addresses?.message && !Array.isArray(errors.addresses) && (
//                 <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 shadow-sm animate-in fade-in zoom-in-95 duration-200">
//                   <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
//                   <div className="flex flex-col">
//                     <p className="font-semibold">Missing Information</p>
//                     <p className="text-destructive/80 text-xs">{errors.addresses.message}</p>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {fields.map((field, index) => (
//               <div key={field.id} className="p-4 border rounded-lg space-y-3 bg-muted/20 relative pt-6">
//                 {fields.length > 1 && (
//                 <button 
//                   type="button" 
//                   onClick={() => remove(index)}
//                   className="absolute top-2 right-2 text-xs text-destructive hover:underline"
//                 >
//                   Remove
//                 </button>
//                 )}

//                 <Controller 
//                   control={control} 
//                   name={`addresses.${index}.name`} 
//                   render={({ field, fieldState }) => (
//                     <Field>
//                       <FieldLabel htmlFor={`form-address-name-${index}`}>Address Label <b className="text-red-500">*</b></FieldLabel>
//                       <FieldContent>
//                         <Input
//                           {...field}
//                           id={`form-address-name-${index}`}
//                           aria-invalid={fieldState.invalid}
//                           placeholder="e.g. Home A"
//                         />
//                         {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                       </FieldContent>
//                     </Field>
//                   )}
//                 />

//                 <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
//                   <Controller 
//                     control={control} 
//                     name={`addresses.${index}.address1`} 
//                     render={({ field, fieldState }) => (
//                       <Field>
//                         <FieldLabel htmlFor={`form-address-address1-${index}`}>Street Address <b className="text-red-500">*</b></FieldLabel>
//                         <FieldContent>
//                           <Input
//                             {...field}
//                             id={`form-address-address1-${index}`}
//                             aria-invalid={fieldState.invalid}
//                           />
//                           {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                         </FieldContent>
//                       </Field>
//                     )}
//                   />
//                   <Controller 
//                     control={control} 
//                     name={`addresses.${index}.address2`} 
//                     render={({ field, fieldState }) => (
//                       <Field>
//                         <FieldLabel htmlFor={`form-address-address2-${index}`}>Suite / Floor / Unit</FieldLabel>
//                         <FieldContent>
//                           <Input
//                             {...field}
//                             id={`form-address-address2-${index}`}
//                             aria-invalid={fieldState.invalid}
//                           />
//                           {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                         </FieldContent>
//                       </Field>
//                     )}
//                   />
//                 </FieldGroup>
//                 <FieldGroup className="grid grid-cols-1 sm:grid-cols-3 gap-3">
//                   <Controller 
//                     control={control} 
//                     name={`addresses.${index}.city`} 
//                     render={({ field, fieldState }) => (
//                       <Field>
//                         <FieldLabel htmlFor={`form-address-city-${index}`}>City <b className="text-red-500">*</b></FieldLabel>
//                         <FieldContent>
//                           <Input
//                             {...field}
//                             id={`form-address-city-${index}`}
//                             aria-invalid={fieldState.invalid}
//                           />
//                           {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                         </FieldContent>
//                       </Field>
//                     )}
//                   />
//                   <Controller 
//                     control={control} 
//                     name={`addresses.${index}.state`} 
//                     render={({ field, fieldState }) => (
//                       <Field>
//                         <FieldLabel htmlFor={`form-address-state-${index}`}>State <b className="text-red-500">*</b></FieldLabel>
//                         <FieldContent>
//                           <Input
//                             {...field}
//                             id={`form-address-state-${index}`}
//                             aria-invalid={fieldState.invalid}
//                           />
//                           {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                         </FieldContent>
//                       </Field>
//                     )}
//                   />
//                   <Controller 
//                     control={control} 
//                     name={`addresses.${index}.postalCode`} 
//                     render={({ field, fieldState }) => (
//                       <Field>
//                         <FieldLabel htmlFor={`form-address-postalCode-${index}`}>Zip <b className="text-red-500">*</b></FieldLabel>
//                         <FieldContent>
//                           <Input
//                             {...field}
//                             id={`form-address-postalCode-${index}`}
//                             aria-invalid={fieldState.invalid}
//                           />
//                           {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                         </FieldContent>
//                       </Field>
//                     )}
//                   />
                
//                 </FieldGroup>

//                 <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                   <Controller 
//                     control={control} 
//                     name={`addresses.${index}.country`} 
//                     render={({ field, fieldState }) => (
//                       <Field>
//                         <FieldLabel htmlFor={`form-addresses.${index}.country`}>Country <b className="text-red-500">*</b></FieldLabel>
//                         <FieldContent>
//                           <Input
//                             {...field}
//                             id={`form-addresses.${index}.country`} 
//                             placeholder="e.g., United States"
//                             aria-invalid={fieldState.invalid}
//                           />
//                           {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                         </FieldContent>
//                       </Field>
//                     )}
//                   />
//                   <Controller
//                     name={`addresses.${index}.addressType`} 
//                     control={control}
//                     render={({ field, fieldState }) => (
//                       <Field data-invalid={fieldState.invalid}>
//                         <FieldLabel htmlFor="form-addressType">
//                           Address Type 
//                         </FieldLabel>
//                         <FieldContent className="relative">
//                           <Select
//                             name={field.name}
//                             onValueChange={(val) => field.onChange(val === "null" ? null : val)} 
//                             value={field.value ?? "null"}
//                           >
//                             <SelectTrigger
//                               id="form-addressType"
//                               aria-invalid={fieldState.invalid}
//                               className="w-full"
//                             >
//                               <SelectValue placeholder="Select" />
//                             </SelectTrigger>
//                             <SelectContent position="item-aligned">
//                               <SelectItem value="null">Not Specified</SelectItem>
//                               <SelectItem value="Commercial">Commercial</SelectItem>
//                               <SelectItem value="Residential">Residential</SelectItem>
//                             </SelectContent>
//                           </Select>
//                         </FieldContent>
//                         {fieldState.invalid && (
//                           <FieldError errors={[fieldState.error]} />
//                         )}
//                       </Field>
//                     )}
//                   />
                  
//                 </FieldGroup>

//                 <Controller
//                   name={`addresses.${index}.remarks`} 
//                   control={control}
//                   render={({ field, fieldState }) => (
//                     <Field>
//                       <FieldLabel htmlFor={`form-address-remarks-${index}`}>Notes / Comments</FieldLabel>
//                       <Textarea
//                         {...field}
//                         id={`form-address-remarks-${index}`}
//                         aria-invalid={fieldState.invalid}
//                         placeholder="Optional"
//                         className="min-h-[120px]"
//                       />
//                       {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                     </Field>
//                   )}
//                 />

//                 <div className="flex gap-4 border-t pt-3">
//                   <Controller 
//                     control={control} 
//                     name={`addresses.${index}.isDefaultBilling`} 
//                     render={({ field }) => (
//                       <label className="flex items-center gap-2 cursor-pointer select-none">
//                         <input 
//                           type="checkbox" 
//                           checked={field.value} 
//                           onChange={(e) => {
//                             field.onChange(e.target.checked);
//                             handleDefaultChange(index, "isDefaultBilling", e.target.checked);
//                           }} 
//                         /> Default Billing
//                       </label>
//                     )}
//                   />

//                   <Controller 
//                     control={control} 
//                     name={`addresses.${index}.isDefaultShipping`} 
//                     render={({ field }) => (
//                       <label className="flex items-center gap-2 cursor-pointer select-none">
//                         <input 
//                           type="checkbox" 
//                           checked={field.value} 
//                           onChange={(e) => {
//                             field.onChange(e.target.checked);
//                             handleDefaultChange(index, "isDefaultShipping", e.target.checked);
//                           }} 
//                         /> Default Shipping
//                       </label>
//                     )}
//                   />
//                 </div>
//               </div>
//             ))}
//             <Button
//                 type="button"
//                 variant="outline"
//                 size="sm"
//                 className="w-full"
//                 onClick={() => append({ 
//                     name: "", address1: "", address2: "", city: "", state: "", 
//                     country: "Philippines", postalCode: "", addressType: null, 
//                     isDefaultBilling: false, isDefaultShipping: false, remarks: ""
//                   })}
//                 disabled={fields.length >= 5}
//               >
//                 + Add Location
//               </Button>
//           </div>

//           {/* Additional Remarks */}
//           <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs sm:hidden">
//             <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
//               <Edit3 className="w-4 h-4 text-primary" /> Additional Remarks
//             </h2>
//             <Controller
//               name="remarks"
//               control={control}
//               render={({ field, fieldState }) => (
//                 <Field data-invalid={fieldState.invalid}>
//                   <FieldLabel htmlFor="form-remarks">Notes / Comments</FieldLabel>
//                   <Textarea
//                     {...field}
//                     id="form-remarks"
//                     aria-invalid={fieldState.invalid}
//                     placeholder="Optional"
//                     className="min-h-[120px]"
//                   />
//                   {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
//                 </Field>
//               )}
//             />
//           </div>
//         </div>
//       </div>

//       {/* Form Action Controls Bar */}
//       <div className="flex items-center justify-between border-t pt-5 mt-6">
//         <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
//           <Link href="/dashboard/customers">
//             <ArrowLeft className="w-3.5 h-3.5" /> Return to Customer Directory
//           </Link>
//         </Button>

//         <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5 text-xs px-5">
//           {isSubmitting ? (
//             <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Data...</>
//           ) : (
//             <><Save className="w-3.5 h-3.5" /> {isEditMode ? "Commit Modifications" : "Save Customer"}</>
//           )}
//         </Button>
//       </div>
//     </form>
//   );
// }
