"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller, type SubmitHandler, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Building2, User, Mail, Phone, MapPin, Landmark, 
  Save, ArrowLeft, Loader2, Globe, Briefcase, Percent, Edit3
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldLabel, FieldError, FieldContent } from "@/components/ui/field";

import { customerMasterSchema, CustomerMasterInput } from "@/schemas/customer.schema";
import { addressFormSchema } from "@/schemas/address.schema";
import z from "zod";

interface UnifiedCustomerFormProps {
  initialData?: any; 
  catalogs: {
    pricing: { id: string; name: string }[];
    taxing: { id: string; name: string }[];
    terms: { id: string; name: string }[];
    locations: { id: string; name: string }[];
    reps: { id: string; name: string }[];
  };
}

export default function UnifiedCustomerForm({ initialData, catalogs }: UnifiedCustomerFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const { 
    register, 
    handleSubmit, 
    control, 
    watch, 
    setValue, 
    formState: { errors, isSubmitting } 
  } = useForm<CustomerMasterInput>({
    resolver: zodResolver(customerMasterSchema),
    defaultValues: {
      id: initialData?.id || "",
      name: initialData?.legalName || "",
      contactName: initialData?.contactName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      website: initialData?.website || "",
      isActive: initialData?.isActive ?? true,
      remarks: initialData?.remarks || "",
      fax: initialData?.fax || "",
      discount: initialData?.discount ?? 0,
      taxExemptNumber: initialData?.taxExemptNumber || "",
      defaultCarrier: initialData?.defaultCarrier || "",
      defaultPaymentMethod: initialData?.defaultPaymentMethod || "",
      defaultLocationId: initialData?.defaultLocationId || "",
      defaultPaymentTermsId: initialData?.defaultPaymentTermsId || "",
      pricingSchemeId: initialData?.pricingSchemeId || "",
      taxingSchemeId: initialData?.taxingSchemeId || "",
      defaultSalesRepTeamMemberId: initialData?.defaultSalesRepTeamMemberId || "",
      addresses: initialData?.addresses || [{
        name: "Home Office", 
        address1: "",
        address2: "",
        city: "",
        state: "", // Critical schema fix: ensure this is present
        country: "Philippines",
        postalCode: "",
        addressType: "Commercial",
        isDefaultBilling: true,
        isDefaultShipping: true,
        remarks: ""
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses"
  });

  const onSubmit: SubmitHandler<CustomerMasterInput> = async (values) => {
    try {
      const res = await fetch("/api/admin/customers", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to commit customer record.");
      }

      toast.success(isEditMode ? "Record Updated" : "Record Created", {
        description: isEditMode 
          ? "The customer ledger has been successfully modified." 
          : "A new customer profile has been initialized."
      });

      router.push("/dashboard/customers");
      router.refresh();
    } catch (error: any) {
      toast.error("Operation Denied", { 
        description: error.message || "An unexpected error occurred during submission." 
      });
    } 
  };

  const handleDefaultChange = (
    selectedIndex: number, 
    fieldToUpdate: "isDefaultBilling" | "isDefaultShipping", 
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

  const getAddressError = (index: number, fieldName: keyof z.infer<typeof addressFormSchema>) => {
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