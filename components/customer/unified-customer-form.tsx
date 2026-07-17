"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller, type SubmitHandler, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Building2, User, Mail, Phone, MapPin, Landmark, 
  Save, ArrowLeft, Loader2, Globe, Briefcase, Percent, Edit3,
  AlertCircle,
  Hash
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldLabel, FieldError, FieldContent, FieldGroup } from "@/components/ui/field";

import { customerFormSchema, CustomerFormData } from "@/schemas/customer.schema";
import { addressFormSchema } from "@/schemas/address.schema";
import z from "zod";
import { FormSelect } from "../shared/form-select";

interface UnifiedCustomerFormProps {
  initialData?: Partial<CustomerFormData>;
  catalogs: {
    currencies: { id: string; name: string }[];
    taxingSchemes: { id: string; name: string }[];
    paymentTerms: { id: string; name: string }[];
    locations: { id: string; name: string }[];
    pricingSchemes: { id: string; name: string }[];
    salesReps: { id: string; name: string }[];
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
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema) as any,
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
      taxExemptNumber: initialData?.taxExemptNumber || "",
      defaultCarrier: initialData?.defaultCarrier || "",
      defaultPaymentMethod: initialData?.defaultPaymentMethod || "Cash",
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
        addressType: null,
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

  const onSubmit = async (values: CustomerFormData) => {
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
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-name">
                    Registered Business Legal Name <b className="text-red-500">*</b>
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-name"
                    aria-invalid={fieldState.invalid}
                    placeholder=""
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Controller
                name="contactName"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-contactName">
                      Primary Contact <b className="text-red-500">*</b>
                    </FieldLabel>
                    <FieldContent className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        id="form-contactName"
                        aria-invalid={fieldState.invalid}
                        placeholder=""
                        className="pl-9 h-9 text-xs" 
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="website"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-website">
                      Corporate Website 
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        id="form-website"
                        aria-invalid={fieldState.invalid}
                        placeholder="https://"
                        className="pl-9 h-9 text-xs" 
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            <FieldGroup className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-email">
                      Billing Email 
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        id="form-email"
                        aria-invalid={fieldState.invalid}
                        placeholder=""
                        className="pl-9 h-9 text-xs" 
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="phone"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-phone">
                      Phone Number <b className="text-red-500">*</b>
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        id="form-phone"
                        aria-invalid={fieldState.invalid}
                        placeholder=""
                        className="pl-9 h-9 text-xs" 
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="fax"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-fax">
                      Fax Number 
                    </FieldLabel>
                      <FieldContent className="relative">
                      <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        id="form-fax"
                        aria-invalid={fieldState.invalid}
                        placeholder=""
                        className="pl-9 h-9 text-xs" 
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            <Field className="lg:col-span-3">
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
              <FormSelect
                name="defaultLocationId"
                control={control}
                label="Default Dispatch Location"
                placeholder="Select a warehouse"
                options={catalogs.locations}
                emptyMessage="No locations available"
              />

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
                          {catalogs.salesReps.length > 0 ? (
                            catalogs.salesReps.map((cat) => (
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

          {/* Additional Remarks */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs hidden sm:block">
            <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-primary" /> Additional Remarks
            </h2>
            <Controller
              name="remarks"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-remarks">Notes / Comments</FieldLabel>
                  <Textarea
                    {...field}
                    id="form-remarks"
                    aria-invalid={fieldState.invalid}
                    placeholder="Optional"
                    className="min-h-[120px]"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
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
              <Controller
                name="pricingSchemeId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-pricingScheme">
                      Pricing Scheme <b className="text-red-500">*</b>
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Select
                        name={field.name}
                        value={field.value ?? ""}
                        onValueChange={(val) => field.onChange(val === "null" ? "" : val)} 
                      >
                        <SelectTrigger
                          id="form-pricingScheme"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned">
                          { catalogs.pricingSchemes.length > 0 ? (
                            catalogs.pricingSchemes.map((val) => (
                              <SelectItem key={val.id} value={val.id}>
                                {val.name}
                              </SelectItem>
                            )))
                          : (
                            <SelectItem value="null">No pricing scheme available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="taxingSchemeId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-taxingScheme">
                      Taxing Scheme <b className="text-red-500">*</b>
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Select
                        name={field.name}
                        value={field.value ?? ""}
                        onValueChange={(val) => field.onChange(val === "null" ? "" : val)} 
                      >
                        <SelectTrigger
                          id="form-taxingScheme"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned">
                          { catalogs.taxingSchemes.length > 0 ? (
                            catalogs.taxingSchemes.map((val) => (
                              <SelectItem key={val.id} value={val.id}>
                                {val.name}
                              </SelectItem>
                            )))
                          : (
                            <SelectItem value="null">No taxing scheme available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Controller
                name="defaultPaymentTermsId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-defaultPaymentTerms">
                      Payment Term 
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Select
                        name={field.name}
                        value={field.value ?? ""}
                        onValueChange={(val) => field.onChange(val === "null" ? "" : val)} 
                      >
                        <SelectTrigger
                          id="form-defaultPaymentTerms"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned">
                          { catalogs.paymentTerms.length > 0 ? (
                            catalogs.paymentTerms.map((val) => (
                              <SelectItem key={val.id} value={val.id}>
                                {val.name}
                              </SelectItem>
                            )))
                          : (
                            <SelectItem value="null">No payment term available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="defaultPaymentMethod"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-defaultPaymentMethod">
                      Payment Method <b className="text-red-500">*</b>
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Select
                        name={field.name}
                        value={field.value ?? ""}
                        onValueChange={(val) => field.onChange(val === "null" ? "" : val)} 
                      >
                        <SelectTrigger
                          id="form-defaultPaymentMethod"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned">
                          {["Cash", "Online Payment", "Cheque", "Master Card", "VISA"].map((method) => (
                            <SelectItem key={method} value={method} className="text-xs">{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
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
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" /> Managed Addresses
                </h2>
              </div>

              {/* CUSTOM ERROR ALERT FOR ADDRESSES ARRAY */}
              {errors.addresses?.message && !Array.isArray(errors.addresses) && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex flex-col">
                    <p className="font-semibold">Missing Information</p>
                    <p className="text-destructive/80 text-xs">{errors.addresses.message}</p>
                  </div>
                </div>
              )}
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-3 bg-muted/20 relative pt-6">
                {fields.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => remove(index)}
                  className="absolute top-2 right-2 text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
                )}

                <Controller 
                  control={control} 
                  name={`addresses.${index}.name`} 
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor={`form-address-name-${index}`}>Address Label <b className="text-red-500">*</b></FieldLabel>
                      <FieldContent>
                        <Input
                          {...field}
                          id={`form-address-name-${index}`}
                          aria-invalid={fieldState.invalid}
                          placeholder="e.g. Home A"
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </FieldContent>
                    </Field>
                  )}
                />

                <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  <Controller 
                    control={control} 
                    name={`addresses.${index}.address1`} 
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor={`form-address-address1-${index}`}>Street Address <b className="text-red-500">*</b></FieldLabel>
                        <FieldContent>
                          <Input
                            {...field}
                            id={`form-address-address1-${index}`}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </FieldContent>
                      </Field>
                    )}
                  />
                  <Controller 
                    control={control} 
                    name={`addresses.${index}.address2`} 
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor={`form-address-address2-${index}`}>Suite / Floor / Unit</FieldLabel>
                        <FieldContent>
                          <Input
                            {...field}
                            id={`form-address-address2-${index}`}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </FieldContent>
                      </Field>
                    )}
                  />
                </FieldGroup>
                <FieldGroup className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Controller 
                    control={control} 
                    name={`addresses.${index}.city`} 
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor={`form-address-city-${index}`}>City <b className="text-red-500">*</b></FieldLabel>
                        <FieldContent>
                          <Input
                            {...field}
                            id={`form-address-city-${index}`}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </FieldContent>
                      </Field>
                    )}
                  />
                  <Controller 
                    control={control} 
                    name={`addresses.${index}.state`} 
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor={`form-address-state-${index}`}>State <b className="text-red-500">*</b></FieldLabel>
                        <FieldContent>
                          <Input
                            {...field}
                            id={`form-address-state-${index}`}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </FieldContent>
                      </Field>
                    )}
                  />
                  <Controller 
                    control={control} 
                    name={`addresses.${index}.postalCode`} 
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor={`form-address-postalCode-${index}`}>Zip <b className="text-red-500">*</b></FieldLabel>
                        <FieldContent>
                          <Input
                            {...field}
                            id={`form-address-postalCode-${index}`}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </FieldContent>
                      </Field>
                    )}
                  />
                
                </FieldGroup>

                <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Controller 
                    control={control} 
                    name={`addresses.${index}.country`} 
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor={`form-addresses.${index}.country`}>Country <b className="text-red-500">*</b></FieldLabel>
                        <FieldContent>
                          <Input
                            {...field}
                            id={`form-addresses.${index}.country`} 
                            placeholder="e.g., United States"
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </FieldContent>
                      </Field>
                    )}
                  />
                  <Controller
                    name={`addresses.${index}.addressType`} 
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="form-addressType">
                          Address Type 
                        </FieldLabel>
                        <FieldContent className="relative">
                          <Select
                            name={field.name}
                            onValueChange={(val) => field.onChange(val === "null" ? null : val)} 
                            value={field.value ?? "null"}
                          >
                            <SelectTrigger
                              id="form-addressType"
                              aria-invalid={fieldState.invalid}
                              className="w-full"
                            >
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent position="item-aligned">
                              <SelectItem value="null">Not Specified</SelectItem>
                              <SelectItem value="Commercial">Commercial</SelectItem>
                              <SelectItem value="Residential">Residential</SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldContent>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  
                </FieldGroup>

                <Controller
                  name={`addresses.${index}.remarks`} 
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor={`form-address-remarks-${index}`}>Notes / Comments</FieldLabel>
                      <Textarea
                        {...field}
                        id={`form-address-remarks-${index}`}
                        aria-invalid={fieldState.invalid}
                        placeholder="Optional"
                        className="min-h-[120px]"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => append({ 
                    name: "", address1: "", address2: "", city: "", state: "", 
                    country: "Philippines", postalCode: "", addressType: null, 
                    isDefaultBilling: false, isDefaultShipping: false, remarks: ""
                  })}
                disabled={fields.length >= 5}
              >
                + Add Location
              </Button>
          </div>

          {/* Additional Remarks */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs sm:hidden">
            <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-primary" /> Additional Remarks
            </h2>
            <Controller
              name="remarks"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-remarks">Notes / Comments</FieldLabel>
                  <Textarea
                    {...field}
                    id="form-remarks"
                    aria-invalid={fieldState.invalid}
                    placeholder="Optional"
                    className="min-h-[120px]"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Customer Directory
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


            {/* {fields.map((field, index) => (
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
            ))} */}