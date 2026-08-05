"use client";

import React from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"; 
import { LucideIcon, X } from "lucide-react";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";

export interface SelectOption {
  id: string;
  name: React.ReactNode;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

function isGroupedOptions(
  options: SelectOption[] | SelectOptionGroup[]
): options is SelectOptionGroup[] {
  return options.length > 0 && "options" in options[0];
}

function areAllOptionsDisabled(
  options: SelectOption[] | SelectOptionGroup[]
): boolean {
  if (options.length === 0) return true;

  if (isGroupedOptions(options)) {
    return options.every((group) =>
      group.options.every((option) => option.disabled)
    );
  }

  return options.every((option) => option.disabled);
}

interface FormSelectProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  placeholder?: string;
  options: SelectOption[] | SelectOptionGroup[];
  emptyMessage?: string;
  disabled?: boolean;
  classNameLabel?: string;
  classNameField?: string;
  classNameInput?: string;
  required?: boolean;
  labelIcon?: LucideIcon;
  clearable?: boolean;
}

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
  required = false,
  clearable = true
}: FormSelectProps<TFieldValues, TName>) {
  const selectId = `form-select-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const hasValue = field.value !== undefined && field.value !== null && field.value !== "";
        const allDisabled = areAllOptionsDisabled(options);

        const handleClear = (e: React.MouseEvent) => {
          e.stopPropagation();
          field.onChange("");
        };

        const renderItems = (items: SelectOption[]) =>
          items.map((option) => (
            <SelectItem
              key={option.id}
              value={option.id}
              disabled={option.disabled}
            >
              {option.name}
            </SelectItem>
          ));

        return (
          <Field data-invalid={fieldState.invalid} className={classNameField}>
            {label && (
              <FieldLabel htmlFor={selectId} className={`flex items-center gap-1 ${classNameLabel}`}>
                {IconLabel && <IconLabel className="w-3.5 h-3.5 text-muted-foreground" />}
                {label} {required && <b className="text-red-500">*</b>}
              </FieldLabel>
            )}

            <FieldContent className="relative">
              {/* Outer InputGroup container handles outer borders */}
              <InputGroup className="w-full focus-within:ring-1 focus-within:ring-ring">
                <Select
                  name={field.name}
                  value={field.value ?? ""}
                  onValueChange={(val) => field.onChange(val === "null" ? "" : val)}
                  disabled={disabled}
                >
                  <SelectTrigger
                    id={selectId}
                    aria-invalid={fieldState.invalid}
                    /* Border & shadow removed here to avoid double-borders with InputGroup */
                    className={`w-full border-0 bg-transparent shadow-none focus:ring-0 text-xs font-medium h-9 ${
                      clearable && hasValue ? "pr-2" : ""
                    } ${classNameInput}`}
                  >
                    <SelectValue placeholder={placeholder} />
                  </SelectTrigger>
                  
                  <SelectContent position="item-aligned">
                    {/* {options && options.length > 0 ? (
                      isGroupedOptions(options) ? (
                        options.map((group, index) => (
                          <SelectGroup key={group.label || index}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {renderItems(group.options)}
                          </SelectGroup>
                        ))
                      ) : (
                        renderItems(options)
                      )
                    ) : (
                      <SelectItem value="null" >
                        {emptyMessage}
                      </SelectItem>
                    )} */}

                    {options && options.length > 0 && !allDisabled ? (
                      isGroupedOptions(options) ? (
                        options.map((group, index) => (
                          <SelectGroup key={group.label || index}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {renderItems(group.options)}
                          </SelectGroup>
                        ))
                      ) : (
                        renderItems(options)
                      )
                    ) : (
                      isGroupedOptions(options) ? (
                        options.map((group, index) => (
                          <SelectGroup key={group.label || index}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {renderItems(group.options)}
                             <SelectItem value="null">
                              {emptyMessage}
                            </SelectItem>
                          </SelectGroup>
                        ))
                      ) : (
                        <>
                          {renderItems(options)}
                          <SelectItem value="null">
                            {emptyMessage}
                          </SelectItem>
                        </>
                      )
                    )}
                  </SelectContent>
                </Select>

                {clearable && hasValue && !disabled && (
                  <InputGroupAddon align="inline-end" className="pr-2">
                    <button
                      type="button"
                      onClick={handleClear}
                      aria-label="Clear selection"
                      className="p-0.5 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </InputGroupAddon>
                )}
              </InputGroup>
            </FieldContent>

            {fieldState.invalid && fieldState.error && (
              <FieldError className="text-xs" errors={[fieldState.error]} />
            )}
          </Field>
        );
      }}
    />
  );
}

// 1. Remove the default values inside the interface definition
interface FormSelectPropsOld<
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
export function FormSelectOld<
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
}: FormSelectPropsOld<TFieldValues, TName>) {
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
              <SelectContent position="item-aligned"  >
                {options && options.length > 0 ? (
                  
                  options.map((option) => (
                    <SelectItem key={option.id} value={option.disabled ? 'null' : option.id} >
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