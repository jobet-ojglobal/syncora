"use client";

import React from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"; // Adjust based on your paths

interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue"> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  required?: boolean;
  icon?: LucideIcon;
  classNameLabel?: string;
  classNameField?: string;
  classNameInput?: string;
}

export function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  required = false,
  icon: Icon,
  type = "text",
  placeholder = "",
  classNameLabel = "",
  classNameField = "",
  classNameInput = "",
  ...props
}: FormInputProps<TFieldValues, TName>) {
  const inputId = `form-input-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, ...fieldProps }, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={classNameField}>
          { label ? 
            <FieldLabel htmlFor={inputId} className={classNameLabel}>
              {label} {required && <b className="text-red-500">*</b>}
            </FieldLabel> : "" 
          }
          <FieldContent className="relative">
            {Icon && (
              <Icon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            )}
            <Input
              {...fieldProps}
              id={inputId}
              type={type}
              placeholder={placeholder}
              aria-invalid={fieldState.invalid}
              className={`${Icon ? "pl-9" : ""} h-8 text-xs ${classNameInput}`}
              value={value ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                // Safely convert numbers to Float/Int for react-hook-form compatibility
                if (type === "number") {
                  onChange(val === "" ? "" : Number(val));
                } else {
                  onChange(val);
                }
              }}
              {...props}
            />
          </FieldContent>
          {fieldState.invalid && fieldState.error && (
            <FieldError className="text-xs" errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  );
}

{/* <FormInput
name="contactName"
control={control}
label="Primary Contact"
required
icon={User}
placeholder="Enter name"
/> */}

    {/* 2. Reusable Standard Base Cost (Number with Step configurations) */}
//   <FormInput
//     name="initialCost"
//     control={control}
//     label="Standard Base Cost ($)"
//     required
//     type="number"
//     step="0.00001"
//     placeholder="0.00"
//     classNameField="md:col-span-1"
//   />