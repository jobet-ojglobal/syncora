"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { VendorFormData, vendorFormSchema } from "@/schemas/vendor.schema"
import { AlertCircle, Briefcase, Building2, Calendar, Edit3, Globe, Hash, Landmark, Mail, MapPin, Phone, TicketPercent, User } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "../ui/switch"
import { Checkbox } from "../ui/checkbox"
import { Textarea } from "../ui/textarea"
import { useRouter } from "next/navigation"

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
      handleSubmit, 
      control, 
      watch, 
      setValue, 
      reset,
      register,
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
      fax: initialData?.fax || "",

      isActive: initialData?.isActive ?? true,

      remarks: initialData?.remarks || "",

      defaultCarrier: initialData?.defaultCarrier || "",

      defaultPaymentMethod: initialData?.defaultPaymentMethod || "",
      defaultPaymentTermsId: initialData?.defaultPaymentTermsId || "",
      taxingSchemeId: initialData?.taxingSchemeId || "",
      currencyId: initialData?.currencyId || "",
      discount: initialData?.discount ?? 0,
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
        addressType: null,
        isDefaultAddress: true,
        remarks: ""
      }],
    },
  })

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
    fieldToUpdate: "isDefaultAddress", 
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
    <form id="form-vendor" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
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
                    autoComplete="off"
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
                        autoComplete="off"
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
                        autoComplete="off"
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
                      Email 
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...field}
                        id="form-email"
                        aria-invalid={fieldState.invalid}
                        placeholder=""
                        autoComplete="off"
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
                        autoComplete="off"
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
                        autoComplete="off"
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

          {/* Operations */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-primary" /> Operations & Fulfillment
            </h2>
            <FieldGroup >
              <Controller
                name="defaultCarrier"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-defaultCarrier">
                      Default Carrier 
                    </FieldLabel>
                    <Input
                      {...field}
                      id="form-defaultCarrier"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
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
          {/* Financial Governance & Settings */}
          <div className="bg-card border rounded-xl p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold border-b pb-2 text-foreground flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-primary" /> Financial Governance & Settings
            </h2>
            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Controller
                name="taxingSchemeId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-taxingScheme">
                      Taxing Policy <b className="text-red-500">*</b>
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Select
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="form-taxingScheme"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned">

                          {catalogs.taxing.map((val) => (
                            <SelectItem key={val.id} value={val.id}>
                              {val.name}
                            </SelectItem>
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
              <Controller
                name="defaultPaymentTermsId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-defaultPaymentTerms">
                      Payment Terms 
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Select
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="form-defaultPaymentTerms"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned">

                          {catalogs.terms.map((val) => (
                            <SelectItem key={val.id} value={val.id}>
                              {val.name}
                            </SelectItem>
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
            </FieldGroup>
            <FieldGroup className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Controller
                name="defaultPaymentMethod"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-defaultPaymentMethod">
                      Payment Method 
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Select
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="form-defaultPaymentMethod"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned">

                          {["Cash", "Online Payment", "Cheque", "Master Card", "VISA"].map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
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
              <Controller
                name="currencyId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-currency">
                      Currency <b className="text-red-500">*</b>
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Select
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="form-currency"
                          aria-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned">

                          {catalogs.currencies.map((val) => (
                            <SelectItem key={val.id} value={val.id}>
                              {val.name}
                            </SelectItem>
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
              <Controller
                name="discount"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-discount">
                      Default Discount (%) 
                    </FieldLabel>
                    <FieldContent className="relative">
                      <TicketPercent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...register("discount", { valueAsNumber: true })}
                        id="form-discount"
                        aria-invalid={fieldState.invalid}
                        placeholder=""
                        autoComplete="off"
                        type="number" 
                        min="0" 
                        max="100" 
                        step="0.1"
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
            <FieldGroup className="grid grid-cols-1 sm:grid-cols-3 gap-3 " >
              <Controller
                name="leadTimeDays"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="form-leadTimeDays">
                      Lead Time (Days) 
                    </FieldLabel>
                    <FieldContent className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        {...register("leadTimeDays", { valueAsNumber: true })}
                        id="form-leadTimeDays"
                        aria-invalid={fieldState.invalid}
                        placeholder=""
                        type="number" 
                        min="0" 
                        className="pl-9 h-9 text-xs" 
                      />
                    </FieldContent>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              
              <div className="flex items-center space-x-2 mt-2 h-full ">
                <Controller
                  name="isTaxInclusivePricing"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field
                      orientation="horizontal"
                      data-invalid={fieldState.invalid}
                    >
                      <Checkbox
                        id="form-isTaxInclusivePricing"
                        name={field.name}
                        aria-invalid={fieldState.invalid}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <FieldLabel
                        htmlFor="form-isTaxInclusivePricing"
                        className="font-normal"
                      >
                        Prices Include Tax
                      </FieldLabel>
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>

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
                          Address Type <b className="text-red-500">*</b>
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

                <div className="flex gap-4 border-t pt-3 mt-2">
                  <Controller 
                    control={control} 
                    name={`addresses.${index}.isDefaultAddress`} 
                    render={({ field }) => (
                      <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                        <input 
                          type="checkbox" 
                          checked={field.value} 
                          onChange={(e) => {
                            field.onChange(e.target.checked);
                            handleDefaultChange(index, "isDefaultAddress", e.target.checked);
                          }} 
                        /> Default Billing
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
                    country: "Philippines", postalCode: "", addressType: "Commercial", 
                    isDefaultAddress: false, remarks: ""
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

      <Field orientation="horizontal" className="flex justify-end pt-4">
        <Button type="button" variant="outline" onClick={() => reset()}>
          Reset
        </Button>
        <Button type="submit" form="form-vendor">
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </Field>
    </form>
  )
}


  