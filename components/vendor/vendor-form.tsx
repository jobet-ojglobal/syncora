"use client";

import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";

// Assuming standard Shadcn UI components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Custom UI wrappers provided in prompt
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

import { vendorFormSchema, VendorFormData, businessPartnerAddressSchema } from "@/schemas/vendor.schema";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface VendorFormProps {
  initialData?: Partial<VendorFormData>;
  catalogs: {
      currencies: { id: string; name: string }[];
      taxing: { id: string; name: string }[];
      terms: { id: string; name: string }[];
  };
}

export function VendorForm({ initialData, catalogs }: VendorFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const {
    register, 
    handleSubmit, 
    control, 
    watch, 
    setValue, 
    formState: { errors, isSubmitting } 
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      id: initialData?.id || "",
      name: initialData?.name || "",
      contactName: initialData?.contactName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      website: initialData?.website || "",
      isActive: initialData?.isActive ?? true,
      remarks: initialData?.remarks || "",
      fax: initialData?.fax || "",

      discount: initialData?.discount ?? 0,
      defaultCarrier: initialData?.defaultCarrier || "",
      defaultPaymentMethod: initialData?.defaultPaymentMethod || "",

      defaultPaymentTermsId: initialData?.defaultPaymentTermsId || "",
      taxingSchemeId: initialData?.taxingSchemeId || "",
      currencyId: initialData?.currencyId || "",
      leadTimeDays: initialData?.leadTimeDays ?? 0,
      isTaxInclusivePricing: initialData?.isTaxInclusivePricing ?? false,

      addresses: initialData?.addresses || [{
        name: "Home Office", 
        address1: "",
        address2: "",
        city: "",
        state: "", // Critical schema fix: ensure this is present
        country: "Philippines",
        postalCode: "",
        addressType: "Commercial",
        isDefaultAddress: true,
        remarks: ""
      }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses"
  });
  
  const onSubmit = async (values: VendorFormData) => {
    try {
      const res = await fetch("/api/admin/vendors", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to commit vendor record.");
      }

      toast.success(isEditMode ? "Record Updated" : "Record Created", {
        description: isEditMode 
          ? "The vendor ledger has been successfully modified." 
          : "A new vendor profile has been initialized."
      });

      router.push("/dashboard/vendors");
      router.refresh();
    } catch (error: any) {
      toast.error("Operation Denied", { 
        description: error.message || "An unexpected error occurred during submission." 
      });
    } 
  };

  const handleDefaultChange = (
    selectedIndex: number, 
    fieldToUpdate: "isDefaultAddress" | "isDefaultShipping", 
    newValue: boolean
  ) => {
    if (!newValue) return;

    // Updates state safely across all fields using clean loop indexing via hook primitives
    fields.forEach((_, index) => {
      if (index !== selectedIndex) {
        setValue(`addresses.${index}.${fieldToUpdate}`, false);
      }
    });
  };

  const getAddressError = (index: number, fieldName: keyof z.infer<typeof businessPartnerAddressSchema>) => {
    return errors.addresses?.[index]?.[fieldName]?.message;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 ">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column */}
            <div className="space-y-6">
              {/* Core Profile */}
              <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
                <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-primary" /> Corporate Entity Information
                </h2>
    
                <Controller 
                  control={control} 
                  name="name" 
                  render={({ field, fieldState }) => (
                    <Field className="space-y-1.5">
                      <FieldLabel>Registered Business Legal Name *</FieldLabel>
                      <FieldContent><Input {...field} className="h-9 text-xs" /></FieldContent>
                      {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                    </Field>
                  )}
                />
    
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Controller 
                    control={control} 
                    name="contactName" 
                    render={({ field, fieldState }) => (
                      <Field className="space-y-1.5">
                        <FieldLabel>Primary Contact</FieldLabel>
                        <FieldContent>
                          <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                            <Input {...field} className="pl-9 h-9 text-xs" />
                          </div>
                        </FieldContent>
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </Field>
                    )}
                  />
                  <Controller 
                    control={control} 
                    name="website" 
                    render={({ field, fieldState }) => (
                      <Field className="space-y-1.5">
                        <FieldLabel>Corporate Website</FieldLabel>
                        <FieldContent>
                          <div className="relative">
                            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                            <Input {...field} type="url" placeholder="https://" className="pl-9 h-9 text-xs" />
                          </div>
                        </FieldContent>
                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                      </Field>
                    )}
                  />
                </div>
    
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Field className="space-y-1.5">
                    <FieldLabel>Billing Email</FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                        <Input type="email" className="pl-9 h-9 text-xs lowercase" {...register("email")} />
                      </div>
                    </FieldContent>
                    {errors.email && <FieldError>{errors.email.message}</FieldError>}
                  </Field>
    
                  <Field className="space-y-1.5">
                    <FieldLabel>Phone Number</FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                        <Input className="pl-9 h-9 text-xs" {...register("phone")} />
                      </div>
                    </FieldContent>
                    {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
                  </Field>
    
                  <Field className="space-y-1.5">
                    <FieldLabel>Fax Number</FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                        <Input className="pl-9 h-9 text-xs" {...register("fax")} />
                      </div>
                    </FieldContent>
                    {errors.fax && <FieldError>{errors.fax.message}</FieldError>}
                  </Field>
                </div>
    
                <Field className="lg:col-span-3 h-full">
                  <div className="border rounded-lg bg-muted/20 p-4 min-h-[74px] flex justify-between items-center gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">Account Status</p>
                      <p className="text-xs text-muted-foreground leading-normal">Controls transactional accessibility.</p>
                    </div>
                    <Switch
                      className="shrink-0"
                      checked={watch("isActive")}
                      onCheckedChange={(value) => setValue("isActive", value)}
                    />
                  </div>
                </Field>
              </div>
    
              {/* Operations & Logistics */}
              <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
                <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-primary" /> Operations & Fulfillment
                </h2>
    
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Default Dispatch Location</FieldLabel>
                    <Controller
                      control={control}
                      name="defaultLocationId"
                      render={({ field, fieldState }) => (
                        <>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogs.locations.length > 0 ? (
                                catalogs.locations.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))
                              ) : (
                                <SelectItem value="0" disabled>No locations available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                        </>
                      )}
                    />
                  </Field>
    
                  <Field>
                    <FieldLabel>Default Shipping Carrier</FieldLabel>
                    <FieldContent>
                      <Input placeholder="e.g. FedEx Ground" className="h-9 text-xs" {...register("defaultCarrier")} />
                    </FieldContent>
                  </Field>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Assigned Sales Representative</FieldLabel>
                    <Controller
                      control={control}
                      name="defaultSalesRepTeamMemberId"
                      render={({ field, fieldState }) => (
                        <>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Representative" />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogs.reps.length > 0 ? (
                                catalogs.reps.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))
                              ) : (
                                <SelectItem value="0" disabled>No sales representatives available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                        </>
                      )}
                    />
                  </Field>
                </div>
              </div>
            </div>
    
            {/* Right Column */}
            <div className="space-y-6">
              {/* Financial Account Settings */}
              <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
                <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-primary" /> Financial Governance
                </h2>
    
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Pricing Matrix *</FieldLabel>
                    <Controller
                      control={control}
                      name="pricingSchemeId"
                      render={({ field, fieldState }) => (
                        <>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Pricing Matrix" />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogs.pricing.length > 0 ? (
                                catalogs.pricing.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))
                              ) : (
                                <SelectItem value="0" disabled>No pricing matrices available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                        </>
                      )}
                    />
                  </Field>
    
                  <Field>
                    <FieldLabel>Taxing Policy *</FieldLabel>
                    <Controller
                      control={control}
                      name="taxingSchemeId"
                      render={({ field, fieldState }) => (
                        <>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Taxing Policy" />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogs.taxing.length > 0 ? (
                                catalogs.taxing.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))
                              ) : (
                                <SelectItem value="0" disabled>No taxing policies available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                        </>
                      )}
                    />
                  </Field>
                </div>
    
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Payment Terms</FieldLabel>
                    <Controller
                      control={control}
                      name="defaultPaymentTermsId"
                      render={({ field, fieldState }) => (
                        <>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Payment Terms" />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogs.terms.length > 0 ? (
                                catalogs.terms.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))
                              ) : (
                                <SelectItem value="0" disabled>No payment terms available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                        </>
                      )}
                    />
                  </Field>
    
                  <Field>
                    <FieldLabel>Payment Method</FieldLabel>
                    <Controller
                      control={control}
                      name="defaultPaymentMethod"
                      render={({ field, fieldState }) => (
                        <>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Payment Method" />
                            </SelectTrigger>
                            <SelectContent>
                              {["Cash", "Online Payment", "Cheque", "Master Card", "VISA"].map((method) => (
                                <SelectItem key={method} value={method} className="text-xs">{method}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                        </>
                      )}
                    />
                  </Field>
                </div>
    
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel>Tax Exempt / VAT ID</FieldLabel>
                    <FieldContent><Input placeholder="Optional" className="h-9 text-xs" {...register("taxExemptNumber")} /></FieldContent>
                    {errors.taxExemptNumber && <FieldError>{errors.taxExemptNumber.message}</FieldError>}
                  </Field>
    
                  <Field>
                    <FieldLabel>Standing Discount Rate</FieldLabel>
                    <FieldContent>
                      <div className="relative">
                        <Percent className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                        <Input type="number" min="0" max="100" step="0.1" className="pl-9 h-9 text-xs" {...register("discount")} />
                      </div>
                    </FieldContent>
                    {errors.discount && <FieldError>{errors.discount.message}</FieldError>}
                  </Field>
                </div>
              </div>
    
              {/* Managed Addresses */}
              <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" /> Managed Addresses
                  </h2>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="xs" 
                    onClick={() => append({ 
                      name: "", address1: "", address2: "", city: "", state: "", 
                      country: "USA", postalCode: "", addressType: "Commercial", 
                      isDefaultBilling: false, isDefaultShipping: false, remarks: ""
                    })}
                  >
                    + Add Location
                  </Button>
                </div>
    
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-3 bg-muted/20 relative pt-6">
                    <button 
                      type="button" 
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 text-xs text-destructive hover:underline"
                    >
                      Remove
                    </button>
    
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Controller 
                        control={control} 
                        name={`addresses.${index}.name`} 
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Label (e.g. Home A)</FieldLabel>
                            <FieldContent><Input {...field} className="h-8 text-xs w-full" /></FieldContent>
                            {getAddressError(index, "name") && <FieldError>{getAddressError(index, "name")}</FieldError>}
                          </Field>
                        )}
                      />
                      <Controller 
                        control={control} 
                        name={`addresses.${index}.address1`} 
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Street Address</FieldLabel>
                            <FieldContent><Input {...field} className="h-8 text-xs w-full" /></FieldContent>
                            {getAddressError(index, "address1") && <FieldError>{getAddressError(index, "address1")}</FieldError>}
                          </Field>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Controller 
                        control={control} 
                        name={`addresses.${index}.city`} 
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>City</FieldLabel>
                            <FieldContent><Input {...field} className="h-8 text-xs w-full" /></FieldContent>
                            {getAddressError(index, "city") && <FieldError>{getAddressError(index, "city")}</FieldError>}
                          </Field>
                        )}
                      />
                      <Controller 
                        control={control} 
                        name={`addresses.${index}.state`} 
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>State</FieldLabel>
                            <FieldContent><Input {...field} className="h-8 text-xs w-full" /></FieldContent>
                            {getAddressError(index, "state") && <FieldError>{getAddressError(index, "state")}</FieldError>}
                          </Field>
                        )}
                      />
                    </div>
    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <Controller 
                        control={control} 
                        name={`addresses.${index}.postalCode`} 
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Zip</FieldLabel>
                            <FieldContent><Input {...field} className="h-8 text-xs w-full" /></FieldContent>
                            {getAddressError(index, "postalCode") && <FieldError>{getAddressError(index, "postalCode")}</FieldError>}
                          </Field>
                        )}
                      />
                      <Controller 
                        control={control} 
                        name={`addresses.${index}.addressType`} 
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Address Type</FieldLabel>
                            <FieldContent>
                              <Select 
                                onValueChange={(val) => field.onChange(val === "null" ? null : val)} 
                                value={field.value ?? "null"}
                              >
                                <SelectTrigger className="h-9 text-xs w-full">
                                  <SelectValue placeholder="Select type (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="null">Not Specified</SelectItem>
                                  <SelectItem value="Commercial">Commercial</SelectItem>
                                  <SelectItem value="Residential">Residential</SelectItem>
                                </SelectContent>
                              </Select>
                            </FieldContent>
                          </Field>
                        )}
                      />
    
                      <Controller 
                        control={control} 
                        name={`addresses.${index}.address2`} 
                        render={({ field }) => (
                          <Field>
                            <FieldLabel>Suite / Floor / Unit</FieldLabel>
                            <FieldContent>
                              <Input {...field} placeholder="Optional" className="h-9 text-xs w-full" />
                            </FieldContent>
                            {getAddressError(index, "address2") && <FieldError>{getAddressError(index, "address2")}</FieldError>}
                          </Field>
                        )}
                      />
                    </div>
    
                    <Controller 
                      control={control} 
                      name={`addresses.${index}.remarks`} 
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Remarks</FieldLabel>
                          <FieldContent>
                            <Input {...field} placeholder="Delivery instructions..." className="h-9 text-xs" />
                          </FieldContent>
                          {getAddressError(index, "remarks") && <FieldError>{getAddressError(index, "remarks")}</FieldError>}
                        </Field>
                      )}
                    />
    
                    <div className="flex gap-4 border-t pt-3">
                      <Controller 
                        control={control} 
                        name={`addresses.${index}.isDefaultBilling`} 
                        render={({ field }) => (
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={field.value} 
                              onChange={(e) => {
                                field.onChange(e.target.checked);
                                handleDefaultChange(index, "isDefaultBilling", e.target.checked);
                              }} 
                            /> Default Billing
                          </label>
                        )}
                      />
    
                      <Controller 
                        control={control} 
                        name={`addresses.${index}.isDefaultShipping`} 
                        render={({ field }) => (
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={field.value} 
                              onChange={(e) => {
                                field.onChange(e.target.checked);
                                handleDefaultChange(index, "isDefaultShipping", e.target.checked);
                              }} 
                            /> Default Shipping
                          </label>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
    
              {/* Additional Remarks */}
              <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
                <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-primary" /> Additional Remarks
                </h2>
                <Controller 
                  control={control} 
                  name="remarks" 
                  render={({ field }) => (
                    <Field className="space-y-1.5">
                      <FieldLabel>Notes / Comments</FieldLabel>
                      <FieldContent><Textarea placeholder="Optional" className="text-xs" {...field} /></FieldContent>
                    </Field>
                  )}
                />
              </div>
            </div>
          </div>
    
          {/* Form Action Controls Bar */}
          <div className="flex items-center justify-between border-t pt-5 mt-6">
            <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
              <Link href="/dashboard/customers">
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Customer Index
              </Link>
            </Button>
    
            <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5 text-xs px-5">
              {isSubmitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Data...</>
              ) : (
                <><Save className="w-3.5 h-3.5" /> {isEditMode ? "Commit Modifications" : "Save Customer"}</>
              )}
            </Button>
          </div>
        </form>
  
  );
}

      
    // <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
      
    //   {/* ─── BASIC INFORMATION ────────────────────────────────────────── */}
    //   <FieldSet>
    //     <FieldLegend>Business Partner Information</FieldLegend>
    //     <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
    //       <Field>
    //         <FieldLabel htmlFor="name">Vendor Name *</FieldLabel>
    //         <Input id="name" {...register("name")} placeholder="Acme Corp" />
    //         {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
    //       </Field>

    //       <Field>
    //         <FieldLabel htmlFor="contactName">Primary Contact</FieldLabel>
    //         <Input id="contactName" {...register("contactName")} placeholder="Jane Doe" />
    //       </Field>

    //       <Field>
    //         <FieldLabel htmlFor="email">Email</FieldLabel>
    //         <Input id="email" type="email" {...register("email")} placeholder="billing@acme.com" />
    //         {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
    //       </Field>

    //       <Field>
    //         <FieldLabel htmlFor="phone">Phone</FieldLabel>
    //         <Input id="phone" {...register("phone")} placeholder="+1 555-0123" />
    //       </Field>

    //       <Field className="md:col-span-2">
    //         <FieldLabel htmlFor="website">Website</FieldLabel>
    //         <Input id="website" {...register("website")} placeholder="https://acme.com" />
    //       </Field>
          
    //       <div className="flex items-center space-x-2 md:col-span-2 mt-2">
    //         <Controller
    //           control={control}
    //           name="isActive"
    //           render={({ field }) => (
    //             <Checkbox
    //               id="isActive"
    //               checked={field.value}
    //               onCheckedChange={field.onChange}
    //             />
    //           )}
    //         />
    //         <FieldLabel htmlFor="isActive" className="mb-0 cursor-pointer">
    //           Active Vendor
    //         </FieldLabel>
    //       </div>
    //     </FieldGroup>
    //   </FieldSet>

    //   {/* ─── VENDOR FINANCIALS & SETTINGS ────────────────────────────── */}
    //   <FieldSet>
    //     <FieldLegend>Financial Details & Settings</FieldLegend>
    //     <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
    //       <Field>
    //         <FieldLabel>Currency</FieldLabel>
    //         <Controller
    //           control={control}
    //           name="currencyId"
    //           render={({ field }) => (
    //             <Select onValueChange={field.onChange} value={field.value}>
    //               <SelectTrigger>
    //                 <SelectValue placeholder="Select a currency" />
    //               </SelectTrigger>
    //               <SelectContent>
    //                 {catalogs.currencies.map((currency) => (
    //                   <SelectItem key={currency.id} value={currency.id}>
    //                     {currency.name}
    //                   </SelectItem>
    //                 ))}
    //               </SelectContent>
    //             </Select>
    //           )}
    //         />
    //       </Field>

    //       <Field>
    //         <FieldLabel>Payment Terms</FieldLabel>
    //         <Controller
    //           control={control}
    //           name="defaultPaymentTermsId"
    //           render={({ field }) => (
    //             <Select onValueChange={field.onChange} value={field.value}>
    //               <SelectTrigger>
    //                 <SelectValue placeholder="Select terms" />
    //               </SelectTrigger>
    //               <SelectContent>
    //                 {catalogs.terms.map((term) => (
    //                   <SelectItem key={term.id} value={term.id}>
    //                     {term.name}
    //                   </SelectItem>
    //                 ))}
    //               </SelectContent>
    //             </Select>
    //           )}
    //         />
    //       </Field>

    //       <Field>
    //         <FieldLabel htmlFor="discount">Default Discount (%)</FieldLabel>
    //         <Input id="discount" type="number" step="0.01" {...register("discount")} />
    //       </Field>

    //       <Field>
    //         <FieldLabel htmlFor="leadTimeDays">Lead Time (Days)</FieldLabel>
    //         <Input id="leadTimeDays" type="number" {...register("leadTimeDays")} />
    //       </Field>

    //       <div className="flex items-center space-x-2 md:col-span-2 mt-2">
    //         <Controller
    //           control={control}
    //           name="isTaxInclusivePricing"
    //           render={({ field }) => (
    //             <Checkbox
    //               id="isTaxInclusivePricing"
    //               checked={field.value}
    //               onCheckedChange={field.onChange}
    //             />
    //           )}
    //         />
    //         <FieldLabel htmlFor="isTaxInclusivePricing" className="mb-0 cursor-pointer">
    //           Prices Include Tax
    //         </FieldLabel>
    //       </div>
    //     </FieldGroup>
    //   </FieldSet>

    //   {/* ─── ADDRESSES (FIELD ARRAY) ──────────────────────────────────── */}
    //   <FieldSet>
    //     <div className="flex justify-between items-center mb-4">
    //       <FieldLegend className="mb-0">Addresses</FieldLegend>
    //       <Button 
    //         type="button" 
    //         variant="outline" 
    //         size="sm" 
    //         onClick={() => appendAddress({
    //           name: "",
    //           address1: "",
    //           address2: "",
    //           city: "",
    //           state: "",
    //           country: "",
    //           postalCode: "",
    //           remarks: "",
    //           addressType: undefined,
    //           isDefaultAddress: false
    //         })}
    //       >
    //         <Plus className="w-4 h-4 mr-2" /> Add Address
    //       </Button>
    //     </div>
        
    //     {addressFields.length === 0 && (
    //       <p className="text-sm text-gray-500 italic">No addresses added yet.</p>
    //     )}

    //     <div className="space-y-6">
    //       {addressFields.map((field, index) => (
    //         <div key={field.id} className="p-4 border rounded-md bg-slate-50 relative">
    //           <Button
    //             type="button"
    //             variant="ghost"
    //             size="icon"
    //             className="absolute top-2 right-2 text-red-500 hover:text-red-700"
    //             onClick={() => removeAddress(index)}
    //           >
    //             <Trash2 className="w-4 h-4" />
    //           </Button>
              
    //           <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
    //             <Field className="md:col-span-2">
    //               <FieldLabel>Address Label (e.g., Warehouse, HQ)</FieldLabel>
    //               <Input {...register(`addresses.${index}.name` as const)} />
    //             </Field>

    //             <Field>
    //               <FieldLabel>Address Line 1</FieldLabel>
    //               <Input {...register(`addresses.${index}.address1` as const)} />
    //             </Field>

    //             <Field>
    //               <FieldLabel>Address Line 2</FieldLabel>
    //               <Input {...register(`addresses.${index}.address2` as const)} />
    //             </Field>

    //             <Field>
    //               <FieldLabel>City</FieldLabel>
    //               <Input {...register(`addresses.${index}.city` as const)} />
    //             </Field>

    //             <Field>
    //               <FieldLabel>State / Province</FieldLabel>
    //               <Input {...register(`addresses.${index}.state` as const)} />
    //             </Field>

    //             <Field>
    //               <FieldLabel>Postal Code</FieldLabel>
    //               <Input {...register(`addresses.${index}.postalCode` as const)} />
    //             </Field>

    //             <Field>
    //               <FieldLabel>Country</FieldLabel>
    //               <Input {...register(`addresses.${index}.country` as const)} />
    //             </Field>

    //             <Field>
    //               <FieldLabel>Address Type</FieldLabel>
    //               <Controller
    //                 control={control}
    //                 name={`addresses.${index}.addressType` as const}
    //                 render={({ field }) => (
    //                   <Select onValueChange={field.onChange} value={field.value}>
    //                     <SelectTrigger>
    //                       <SelectValue placeholder="Select type" />
    //                     </SelectTrigger>
    //                     <SelectContent>
    //                       <SelectItem value="Commercial">Commercial</SelectItem>
    //                       <SelectItem value="Residential">Residential</SelectItem>
    //                     </SelectContent>
    //                   </Select>
    //                 )}
    //               />
    //             </Field>
    //           </FieldGroup>
    //         </div>
    //       ))}
    //     </div>
    //   </FieldSet>

    //   <div className="flex justify-end pt-4">
    //     <Button type="submit" disabled={isSubmitting}>
    //       {isSubmitting ? "Saving..." : "Save Vendor"}
    //     </Button>
    //   </div>
    // </form>