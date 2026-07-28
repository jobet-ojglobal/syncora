"use client";

import React from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"; 
import { LucideIcon } from "lucide-react";

interface SelectOption {
  id: string;
  name: string;
}

// 1. Remove the default values inside the interface definition
interface FormSelectProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  emptyMessage?: string;
  disabled?: boolean;
  classNameLabel?: string;
  classNameField?: string;
  classNameInput?: string;
  required?: boolean;
  labelIcon?: LucideIcon
}

// 2. Remove the default values inside the function declarations as well
export function FormSelect<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  labelIcon: IconLabel,
  placeholder = "Select...",
  options,
  emptyMessage = "No options available",
  classNameLabel = "",
  classNameField = "",
  classNameInput = "",
  disabled = false,
  required = false
}: FormSelectProps<TFieldValues, TName>) {
  const selectId = `form-select-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={classNameField}>
          { (label && !IconLabel) ? 
            <FieldLabel htmlFor={selectId} className={classNameLabel}>
              {label} {required && <b className="text-red-500">*</b>}
            </FieldLabel> : (label && IconLabel) ?  
            <FieldLabel htmlFor={selectId} className={`flex items-center gap-1 ${classNameLabel}`} >
                <IconLabel className="w-3.5 h-3.5 text-muted-foreground" />
                Target Facility Terminal *
              </FieldLabel>
               : "" 
          }

          
          <FieldContent className="relative">
            <Select
              name={field.name}
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val === "null" ? "" : val)}
              disabled={disabled}
            >
              <SelectTrigger
                id={selectId}
                aria-invalid={fieldState.invalid}
                className={`w-full text-xs font-medium h-9 ${classNameInput}`}
              >
                <SelectValue  placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent position="item-aligned" >
                {options && options.length > 0 ? (
                  options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="null" >
                    {emptyMessage}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </FieldContent>
          {fieldState.invalid && fieldState.error && (
            <FieldError className="text-xs" errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  );
}

{/* Dynamic Payment Terms Selection */}
    //   <FormSelect
    //     name="defaultPaymentTermsId"
    //     control={control}
    //     label="Payment Term"
    //     placeholder="Select a term"
    //     options={catalogs.paymentTerms}
    //     emptyMessage="No payment terms available"
    //   />

      {/* Another example reusing the component for Currencies */}
    //   <FormSelect
    //     name="currencyId"
    //     control={control}
    //     label="Default Currency"
    //     placeholder="Select currency"
    //     options={catalogs.currencies}
    //     emptyMessage="No currencies configured"
    //   />