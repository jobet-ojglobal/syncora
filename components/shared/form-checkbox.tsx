"use client";

import React from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { LucideIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface FormCheckboxProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
> {
  name: TName;
  control: Control<TFieldValues>;
  label: string;
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
  disabled?: boolean;
  // Allows optional event interception for custom triggers (e.g., mutex toggles)
  onChange?: (checked: boolean) => void;
}

export function FormCheckbox<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  icon: Icon,
  iconClassName,
  className = "",
  disabled = false,
  onChange,
}: FormCheckboxProps<TFieldValues, TName>) {
  const checkboxId = `form-checkbox-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className={cn("flex items-center space-x-2 select-none", className)}>
          <Checkbox
            id={checkboxId}
            checked={!!field.value}
            disabled={disabled}
            onCheckedChange={(val) => {
              const boolVal = !!val;
              field.onChange(boolVal);
              if (onChange) {
                onChange(boolVal);
              }
            }}
          />
          <label
            htmlFor={checkboxId}
            className={cn(
              "text-[11px] font-bold cursor-pointer text-slate-600 transition-colors flex items-center gap-1",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {Icon && (
              <Icon 
                className={cn("h-3.5 w-3.5 shrink-0", iconClassName || "text-muted-foreground/80")} 
              />
            )}
            <span>{label}</span>
          </label>
        </div>
      )}
    />
  );
}


{/* With an accent left border and a security icon */}
//   <FormCheckbox
//     name="isActive"
//     control={control}
//     label="Active State"
//     icon={ShieldCheck}
//     className="border-l pl-4 border-slate-200"
//   />

  {/* Standard without an icon */}
//   <FormCheckbox
//     name="isTaxExempt"
//     control={control}
//     label="Tax Exempt Client"
//   />

{/* Dynamic Billing Form Selector Grid Context */}
        // <FormCheckbox
        //   name={`addresses.${index}.isDefaultBilling`}
        //   control={control}
        //   label="Default Customer Billing Node"
        //   icon={CreditCard}
        //   iconClassName="text-blue-500"
        //   onChange={(checked) => 
        //     handleAddressCheckboxMutex(index, "isDefaultBilling", checked)
        //   }
        // />

        {/* Dynamic Shipping Form Selector Grid Context */}
        // <FormCheckbox
        //   name={`addresses.${index}.isDefaultShipping`}
        //   control={control}
        //   label="Default Customer Shipping Anchor"
        //   icon={Truck}
        //   iconClassName="text-indigo-500"
        //   onChange={(checked) => 
        //     handleAddressCheckboxMutex(index, "isDefaultShipping", checked)
        //   }
        // />


{/* <FormCheckbox
        name={`addresses.${index}.isDefaultVendorAddress`}
        control={control}
        label="Default Procurement Order Node"
        icon={ClipboardList}
        iconClassName="text-amber-500"
        onChange={(checked) => 
          handleAddressCheckboxMutex(index, "isDefaultVendorAddress", checked)
        }
      /> */}