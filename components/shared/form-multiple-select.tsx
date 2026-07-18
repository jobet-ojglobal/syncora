"use client";

import React, { useState } from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SelectOption {
  id: string;
  name: string;
}

interface FormMultiSelectProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
> {
  name: TName;
  control: Control<TFieldValues>;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  loadingText?: string;
  className?: string;
  onCreateNew?: (searchQuery: string) => void;
  createNewText?: string;
  classNameLabel?: string;
  classNameField?: string;
}

export function FormMultiSelect<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  name,
  control,
  options,
  label,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  loading = false,
  loadingText = "Loading...",
  className = "",
  onCreateNew,
  createNewText = "Add New Item",
  classNameLabel = "",
  classNameField = "",
}: FormMultiSelectProps<TFieldValues, TName>) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        // Enforce array conversion fallback to protect structural integrity
        const selectedIds: string[] = Array.isArray(field.value) ? field.value : [];

        // Build a look-up list of matched objects for tag mapping visualizations
        const selectedObjects = options.filter((opt) =>
          selectedIds.includes(opt.id)
        );

        const handleToggleOption = (id: string) => {
          const updatedIds = selectedIds.includes(id)
            ? selectedIds.filter((item) => item !== id)
            : [...selectedIds, id];
          field.onChange(updatedIds);
        };

        return (
          <div className="flex flex-col gap-1.5 w-full">
            {label && (
              <label className={classNameLabel} >
                {label}
              </label>
            )}

            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={loading}
                  className={cn(
                    "w-full justify-between font-normal text-sm min-h-8 h-auto py-1.5 px-3 shadow-xs items-center gap-2 flex wrap",
                    className
                  )}
                >
                  {loading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> {loadingText}
                    </span>
                  ) : selectedObjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-[90%] pointer-events-auto">
                      {selectedObjects.map((obj) => (
                        <Badge
                          key={obj.id}
                          variant="secondary"
                          className="text-xs font-medium pl-2 pr-1 py-0.5 gap-1 flex items-center bg-slate-100 hover:bg-slate-200 text-slate-800 border-none transition-all"
                          onClick={(e) => {
                            e.stopPropagation(); // Stop popover container toggling actions
                            handleToggleOption(obj.id);
                          }}
                        >
                          <span className="truncate max-w-[120px]">{obj.name}</span>
                          <span className="rounded-sm opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                            <X className="h-3 w-3" />
                          </span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                  )}
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-auto" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-60" align="start">
                <Command value={searchQuery} onValueChange={setSearchQuery}>
                  <CommandInput 
                    placeholder={searchPlaceholder} 
                    className="h-9" 
                  />
                  <CommandList>
                    <CommandEmpty className="p-1">
                      {onCreateNew && searchQuery.trim().length > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full justify-start gap-2 px-2 py-1.5 text-xs text-primary font-medium"
                          onClick={() => {
                            onCreateNew(searchQuery);
                            setSearchQuery("");
                            setOpen(false);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Create item &quot;{searchQuery}&quot;</span>
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">No results found.</p>
                      )}
                    </CommandEmpty>

                    <CommandGroup>
                      {options.map((option) => {
                        const isSelected = selectedIds.includes(option.id);
                        return (
                          <CommandItem
                            key={option.id}
                            value={option.name}
                            onSelect={() => handleToggleOption(option.id)}
                            className="text-sm flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2 flex-1 truncate">
                              <div className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary transition-colors",
                                isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                              )}>
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <span className="truncate">{option.name}</span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>

                  {onCreateNew && (
                    <div className="border-t p-1 mt-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          onCreateNew(searchQuery);
                          setSearchQuery("");
                          setOpen(false);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{createNewText}</span>
                      </Button>
                    </div>
                  )}
                </Command>
              </PopoverContent>
            </Popover>
            
            {fieldState.error && (
              <p className="text-[11px] font-medium text-destructive mt-0.5">
                {fieldState.error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}