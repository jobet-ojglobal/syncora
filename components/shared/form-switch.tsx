"use client";

import React from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { Switch } from "@/components/ui/switch"; // Adjust paths based on your project
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface FormSwitchProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
  control: Control<TFieldValues>;
  label: string;
  description?: string;
  inlineText?: string;
  variant?: "card" | "field" | "inline"; // Supports all 3 UI styles
  className?: string;
}

export function FormSwitch<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  description,
  inlineText,
  variant = "card",
  className = "",
}: FormSwitchProps<TFieldValues, TName>) {
  const switchId = `form-switch-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        if (variant === "inline") {
          return (
            <div className={cn("flex items-center space-x-2 select-none", className)}>
              <Switch
                id={switchId}
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
              <label
                htmlFor={switchId}
                className="text-xs font-bold cursor-pointer text-muted-foreground"
              >
                {label}
              </label>
            </div>
          );
        }

        // Variant 1: Card layout (Bordered, background, optional subtext)
        if (variant === "card") {
          return (
            <div
              className={cn(
                "border rounded-xl p-4 flex justify-between items-center gap-4 transition-colors",
                description ? "bg-muted/20 " : "bg-muted/10 p-3",
                className
              )}
            >
              <div className={description ? "space-y-0.5" : ""}>
                <label
                  htmlFor={switchId}
                  className={cn(
                    "font-semibold text-foreground cursor-pointer select-none",
                    description ? "text-sm" : "text-xs"
                  )}
                >
                  {label}
                </label>
                {description && (
                  <p className="text-xs text-muted-foreground leading-normal">
                    {description}
                  </p>
                )}
              </div>
              <Switch
                id={switchId}
                className="shrink-0"
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
            </div>
          );
        }

        // Variant 2: Standard field block (Label on top, switch inside bordered inline box with helper text)
        return (
          <Field className={className}>
            <FieldLabel htmlFor={switchId}>{label}</FieldLabel>
            <div className="flex items-center h-9 space-x-2 border px-3 rounded-md bg-muted/20">
              <Switch
                id={switchId}
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
              {inlineText && (
                <span className="text-xs font-medium text-muted-foreground select-none">
                  {inlineText}
                </span>
              )}
            </div>
          </Field>
        );
      }}
    />
  );
}

{/* 1. Simple Card Layout (Lot Tracking pattern) */}
{/* <FormSwitch
        name="trackLots"
        control={control}
        label="Lot Tracking"
        variant="card"
      /> */}

      {/* 2. Full Card Layout with Description (Account Status pattern) */}
    //   <FormSwitch
    //     name="isActive"
    //     control={control}
    //     label="Account Status"
    //     description="Controls transactional accessibility."
    //     variant="card"
    //   />

      {/* 3. Field Block Layout with Inline Text label (Global Visibility pattern) */}
    //   <FormSwitch
    //     name="globalVisibility"
    //     control={control}
    //     label="Global Status Visibility"
    //     inlineText="Publish to storefront"
    //     variant="field"
    //   />