"use client";

import React from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"; 
import { LucideIcon } from "lucide-react";

export interface SelectOption {
  id: string;
  name: React.ReactNode; // Supports JSX or plain strings
  disabled?: boolean;
}

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
  labelIcon?: LucideIcon;
  renderOption?: (option: SelectOption) => React.ReactNode;
}

export function FormSelectRender<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  labelIcon: IconLabel,
  placeholder = "Select...",
  options,
  emptyMessage = "No attribute slot available",
  classNameLabel = "",
  classNameField = "",
  classNameInput = "",
  disabled = false,
  required = false,
  renderOption,
}: FormSelectProps<TFieldValues, TName>) {
  const selectId = `form-select-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={classNameField}>
          {label && (
            <FieldLabel
              htmlFor={selectId}
              className={`flex items-center gap-1 ${classNameLabel}`}
            >
              {IconLabel && <IconLabel className="w-3.5 h-3.5 text-muted-foreground" />}
              <span>{label}</span>
              {required && <b className="text-red-500">*</b>}
            </FieldLabel>
          )}

          <FieldContent className="relative">
            <Select
              name={field.name}
              value={field.value ?? ""}
              onValueChange={(val) => field.onChange(val === "__EMPTY__" ? "" : val)}
              disabled={disabled}
            >
              <SelectTrigger
                id={selectId}
                aria-invalid={fieldState.invalid}
                className={`w-full text-xs font-medium h-9 ${classNameInput}`}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              
              <SelectContent position="item-aligned">
                {options && options.length > 0 ? (
                  options.map((option) => (
                    <SelectItem
                      key={option.id}
                      value={option.id}
                      disabled={option.disabled}
                    >
                      {renderOption ? renderOption(option) : option.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__EMPTY__" disabled>
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