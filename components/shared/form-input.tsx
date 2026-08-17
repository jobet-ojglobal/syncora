"use client";

import React, { useState } from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { Eye, EyeOff, LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"; // Adjust based on your paths

interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue"> {
  name: TName;
  control: Control<TFieldValues>;
  label?: string;
  hideLabelOnDesktop?: boolean;
  required?: boolean;
  icon?: LucideIcon;
  isSecret?: boolean;
  classNameLabel?: string;
  classNameField?: string;
  classNameInput?: string;
  description?: string;
}

export function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  description,
  hideLabelOnDesktop = false,
  required = false,
  icon: Icon,
  isSecret = false,
  type = "text",
  placeholder = "",
  classNameLabel = "",
  classNameField = "",
  classNameInput = "",
  ...props
}: FormInputProps<TFieldValues, TName>) {
  const inputId = `form-input-${name}`;
  const [showSecret, setShowSecret] = useState(false);

  // Compute final input type if secret toggle is active
  const computedType = isSecret ? (showSecret ? "text" : "password") : type;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, ...fieldProps }, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={classNameField}>
          { label && !hideLabelOnDesktop ? 
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
              type={computedType}
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
            {isSecret && (
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="absolute right-3 top-2 text-muted-foreground/60 hover:text-foreground transition-colors p-0.5 rounded focus:outline-none"
                aria-label={showSecret ? `Hide ${label || "value"}` : `Show ${label || "value"}`}
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
          </FieldContent>
          <FieldDescription className="text-xs text-muted-foreground">
            {description || (props["aria-describedby"] && (
              <span id={props["aria-describedby"]}>{props["aria-describedby"]}</span>
            ))}
          </FieldDescription>
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

{/* <FormInput
  name="url"
  control={control}
  label="Location Endpoint"
  required
  icon={Globe}
  isSecret
  placeholder="https://"
  autoComplete="off"
/>

// 2. Number input with custom step precision
<FormInput
  name="initialCost"
  control={control}
  label="Standard Base Cost ($)"
  required
  type="number"
  step="0.00001"
  placeholder="0.00"
  classNameField="md:col-span-1"
/>

// 3. Standard Text Input
<FormInput
  name="contactName"
  control={control}
  label="Primary Contact"
  required
  icon={User}
  placeholder="Enter name"
/> */}