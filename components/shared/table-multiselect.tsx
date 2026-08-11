"use client"

import * as React from "react"
import { Check, PlusCircle } from "lucide-react"
import { Column } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

export interface Option {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface TableMultiSelectProps<TData, TValue> {
  /** Optional TanStack Column instance */
  column?: Column<TData, TValue>
  /** Title / Placeholder displayed on button and search */
  title?: string
  /** Available options to select from */
  options: Option[]
  /** Controlled value state (used if column is not provided) */
  value?: string[]
  /** Callback for value changes (used if column is not provided) */
  onValueChange?: (values: string[]) => void
  /** Visual sizing variant */
  size?: "sm" | "default" | "lg"
  className?: string
  classNameTrigger?: string
  classNameContent?: string
  classNameBadge?: string
}

const sizeVariants = {
  sm: {
    button: "h-8 px-2 text-xs",
    icon: "h-3.5 w-3.5",
    badge: "text-[10px] px-1 py-0",
    content: "w-[190px]",
  },
  default: {
    button: "h-9 px-3 text-sm",
    icon: "h-4 w-4",
    badge: "text-xs px-1.5 py-0.5",
    content: "w-[220px]",
  },
  lg: {
    button: "h-10 px-4 text-base",
    icon: "h-5 w-5",
    badge: "text-sm px-2 py-0.5",
    content: "w-[260px]",
  },
}

export function TableMultiSelect<TData, TValue>({
  column,
  title = "Filter",
  options = [],
  value: controlledValue,
  onValueChange,
  size = "default",
  className,
  classNameTrigger,
  classNameContent,
  classNameBadge,
}: TableMultiSelectProps<TData, TValue>) {
  // 1. Resolve selected values from TanStack column or custom state
  const rawValues = column
    ? (column.getFilterValue() as string[])
    : controlledValue

  const selectedValues = React.useMemo(
    () => new Set(rawValues || []),
    [rawValues]
  )

  const variants = sizeVariants[size]

  // 2. Uniform change handler updates TanStack column or triggers callback
  const handleSelect = (optionValue: string) => {
    const nextValues = new Set(selectedValues)

    if (nextValues.has(optionValue)) {
      nextValues.delete(optionValue)
    } else {
      nextValues.add(optionValue)
    }

    const updatedArray = Array.from(nextValues)

    if (column) {
      column.setFilterValue(updatedArray.length ? updatedArray : undefined)
    } else if (onValueChange) {
      onValueChange(updatedArray)
    }
  }

  const handleClear = () => {
    if (column) {
      column.setFilterValue(undefined)
    } else if (onValueChange) {
      onValueChange([])
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "border-dashed flex items-center gap-2 font-medium bg-background hover:bg-accent/50",
            variants.button,
            classNameTrigger,
            className
          )}
        >
          <PlusCircle className={cn(variants.icon, "text-muted-foreground")} />
          <span>{title}</span>

          {selectedValues.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              {selectedValues.size > 2 ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "rounded-sm font-normal",
                    variants.badge,
                    classNameBadge
                  )}
                >
                  {selectedValues.size} selected
                </Badge>
              ) : (
                options
                  .filter((option) => selectedValues.has(option.value))
                  .map((option) => (
                    <Badge
                      variant="secondary"
                      key={option.value}
                      className={cn(
                        "rounded-sm font-normal bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
                        variants.badge,
                        classNameBadge
                      )}
                    >
                      {option.label}
                    </Badge>
                  ))
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0", variants.content, classNameContent)}
        align="start"
      >
        <Command>
          <CommandInput placeholder={`Search ${title.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                const Icon = option.icon

                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>

                    {Icon && (
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}

                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>

            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleClear}
                    className="justify-center text-center text-xs font-medium text-destructive focus:text-destructive cursor-pointer py-2"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}