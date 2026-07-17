"use client";

import React from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea"; // Adjust based on your Shadcn folder paths
import { Field, FieldError, FieldLabel } from "@/components/ui/field"; 

interface FormTextareaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "defaultValue"> {
  name: TName;
  control: Control<TFieldValues>;
  label: string;
  required?: boolean;
  classNameField?: string;
  classNameLabel?: string;
}

export function FormTextarea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  required = false,
  placeholder = "Optional",
  className = "min-h-[120px]",
  classNameField = "",
  classNameLabel = "",
  ...props
}: FormTextareaProps<TFieldValues, TName>) {
  const textareaId = `form-textarea-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={classNameField}>
          <FieldLabel htmlFor={textareaId} className={classNameLabel}>
            {label} {required && <b className="text-red-500">*</b>}
          </FieldLabel>
          <Textarea
            {...field}
            {...props}
            id={textareaId}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid}
            placeholder={placeholder}
            className={className}
          />
          {fieldState.invalid && fieldState.error && (
            <FieldError className="text-xs" errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  );
}

{/* 1. Standard dynamic remarks component */}
    //   <FormTextarea
    //     name="remarks"
    //     control={control}
    //     label="Notes / Comments"
    //     placeholder="Optional"
    //   />

      {/* 2. Custom configuration variant (e.g., required, custom height, custom classes) */}
    //   <FormTextarea
    //     name="internalNotes"
    //     control={control}
    //     label="Required Internal Audit Logs"
    //     required
    //     placeholder="Please detail changes made..."
    //     className="min-h-[80px] text-xs resize-none"
    //     classNameField="md:col-span-2"
    //   />