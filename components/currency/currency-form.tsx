// components/CurrencyForm.tsx
"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { currencySchema, CurrencyInput } from "@/schemas/currency.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Coins, ArrowLeftRight, ArrowLeft, RefreshCw, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";

interface CurrencyFormProps {
  initialData?: any | null;
}

// components/CurrencyForm.tsx (or standard constants file)
const POPULAR_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
];

export function CurrencyForm({ initialData }: CurrencyFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<CurrencyInput>({
    resolver: zodResolver(currencySchema),
    defaultValues: initialData || {
      name: "",
      isoCode: "",
      symbol: "$",
      decimalPlaces: 2,
      decimalSeparator: ".",
      thousandsSeparator: ",",
      isSymbolFirst: true,
      negativeType: "Leading",
      exchangeRate: 1.00000000,
      isManual: true
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;

  // Watch parameters loop hooks to construct a real-time reactive preview box string
  const watchedSymbol = watch("symbol") || "";
  const watchedIsFirst = watch("isSymbolFirst");
  const watchedDecPlaces = watch("decimalPlaces") || 0;
  const watchedDecSep = watch("decimalSeparator") || ".";
  const watchedThousSep = watch("thousandsSeparator") || ",";
  const watchedNegativeType = watch("negativeType");

  const generateFormatSample = (isNegative: boolean) => {
    let baseDigits = `1${watchedThousSep}234${watchedDecSep}`;
    for (let i = 0; i < watchedDecPlaces; i++) baseDigits += "5";
    if (watchedDecPlaces === 0) baseDigits = `1${watchedThousSep}235`;

    let formatted = watchedIsFirst ? `${watchedSymbol} ${baseDigits}` : `${baseDigits} ${watchedSymbol}`;

    if (isNegative) {
      if (watchedNegativeType === "Leading") return `-${formatted}`;
      if (watchedNegativeType === "Trailing") return `${formatted}-`;
      if (watchedNegativeType === "Parentheses") return `(${formatted})`;
    }
    return formatted;
  };

  const syncLatestMarketRates = async () => {
    const code = watch("isoCode")?.trim().toUpperCase();
    if (!code || code.length !== 3) {
      toast.error("Invalid Code Parameter", { description: "Enter a valid 3-character ISO handle to poll live tickers." });
      return;
    }
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/USD`);
      if (!res.ok) throw new Error();
      const marketData = await res.json();
      const targetingRate = marketData.rates[code];
      if (!targetingRate) throw new Error("ISO code not present inside global index vectors arrays.");
      
      setValue("exchangeRate", Number((1 / targetingRate).toFixed(8)), { shouldValidate: true });
      setValue("isManual", false);

      // Auto-update matching currency configuration options
      const matchedMeta = POPULAR_CURRENCIES.find(c => c.code === code);
      if (matchedMeta) {
        setValue("symbol", matchedMeta.symbol, { shouldValidate: true });
        if (!watch("name")) {
          setValue("name", `${matchedMeta.name} Base Metric`, { shouldValidate: true });
        }
      }

      toast.success(`Ticker matched clean: 1 ${code} parsed value metrics tracking line updated.`);
    } catch (err) {
      toast.error("Market Feed Interrupted", { description: "Failed fetching market telemetry data. Reverting to manual overrides." });
    }
  };

  const onSubmit = async (values: CurrencyInput) => {
    try {
      const response = await fetch("/api/admin/currencies", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Execution engine rejected monetary rule mutation mapping.");
      }

      toast.success(isEditMode ? "Currency properties updated" : "New trading currency initialized");
      router.push("/dashboard/currencies");
      router.refresh();
    } catch (err: any) {
      toast.error("Write Aborted", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-5xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-6 text-xs">
      <FieldGroup className="gap-6">
        
        {/* Real-time Ledger Formatting Engine Preview Widget Banner */}
        <div className="bg-slate-900 rounded-xl p-4 text-white font-mono flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">System Ledger Print Sample Preview</span>
            <div className="text-lg font-bold tracking-tight text-primary mt-1 flex gap-4">
              <div>Positive: <span className="text-white">{generateFormatSample(false)}</span></div>
              <div className="text-rose-400">Negative: <span>{generateFormatSample(true)}</span></div>
            </div>
          </div>
          <div className="text-[10px] text-right text-slate-400 bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
            Base Matrix Tracker: <span className="text-emerald-400 font-bold">1.00000000 {watch("isoCode") || "XYZ"}</span>
          </div>
        </div>

        {/* SECTION 1: Core Monetary Definition Properties Fields Card */}
        <FieldSet className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <FieldLegend className="col-span-1 md:col-span-12 flex items-center gap-2 border-b pb-2 text-foreground font-semibold text-sm w-full">
            <Coins className="w-4 h-4 text-primary" /> Forex Currency Definitions Card
          </FieldLegend>

          <Field className="md:col-span-3">
            <FieldLabel>Unique 3-Letter ISO Code *</FieldLabel>
            <Input placeholder="e.g., EUR, JPY, GBP" {...register("isoCode")} disabled={isEditMode} className="font-mono font-bold uppercase tracking-widest text-center" />
            {errors.isoCode && <span className="text-xs text-destructive">{errors.isoCode.message}</span>}
          </Field>

          <Field className="md:col-span-6">
            <FieldLabel>Currency System Display Title *</FieldLabel>
            <Input placeholder="e.g., Euro Member Token, British Pound Sterling" {...register("name")} />
            {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
          </Field>

          {/* SECTION 1: Core Monetary Definition Properties Fields Card */}
          <Field className="md:col-span-3">
            <FieldLabel>Glyph Symbol *</FieldLabel>
            <div className="flex gap-1.5">
              <select
                className="rounded-md border border-input bg-background px-2 h-9 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                onChange={(e) => {
                  if (e.target.value) {
                    setValue("symbol", e.target.value, { shouldValidate: true });
                  }
                }}
                defaultValue={watch("symbol") || "$"}
              >
                <option value="">Custom...</option>
                {POPULAR_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.symbol}>
                    {c.symbol} ({c.code})
                  </option>
                ))}
              </select>
              
              <Input 
                placeholder="e.g., $, €, ₱" 
                {...register("symbol")} 
                className="text-center font-bold h-9 flex-1" 
              />
            </div>
            {errors.symbol && <span className="text-xs text-destructive block mt-1">{errors.symbol.message}</span>}
          </Field>
        </FieldSet>

        {/* SECTION 2: Localization Layout Formatting Strategy Configuration Parameters */}
        <FieldSet className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <FieldLegend className="col-span-1 sm:col-span-2 md:col-span-4 border-b pb-2 mb-4 w-full flex items-center gap-2 font-semibold text-foreground text-sm">
            <Layers className="w-4 h-4 text-muted-foreground" /> Localized Accounting Typographic Settings
          </FieldLegend>

          <Field >
            <FieldLabel>Decimal Separator Token</FieldLabel>
            <Input {...register("decimalSeparator")} className="font-mono text-center font-bold" maxLength={1} />
          </Field>

          <Field>
            <FieldLabel>Thousands Separator Token</FieldLabel>
            <Input {...register("thousandsSeparator")} className="font-mono text-center font-bold" maxLength={1} />
          </Field>

          <Field>
            <FieldLabel>Decimal Precision Capping</FieldLabel>
            <Input type="number" {...register("decimalPlaces", { valueAsNumber: true })} className="font-mono text-center" />
          </Field>

          <Field>
            <FieldLabel>Negative Value Accounting Format</FieldLabel>
            <select 
              {...register("negativeType")} 
              className="w-full rounded-md border border-input bg-background px-3 h-9 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="Leading">Leading Minus (-$100)</option>
              <option value="Trailing">Trailing Minus ($100-)</option>
              <option value="Parentheses">Financial Parentheses (($100))</option>
            </select>
          </Field>

          <Field className="md:col-span-4 flex flex-col justify-end">
            <div className="flex items-center justify-between min-h-9 gap-4 rounded-lg border bg-background px-3 py-1.5 shadow-2xs">
              <div className="space-y-0.5">
                <FieldLabel className="font-semibold text-foreground block">
                  Render Symbol Before Value Numbers Array
                </FieldLabel>
                <span className="text-[10px] text-muted-foreground">
                  True outputs prefix ($100), False structures values with suffixes (100 $).
                </span>
              </div>
              <Switch 
                checked={watch("isSymbolFirst")} 
                onCheckedChange={(val) => setValue("isSymbolFirst", val)}
                className="scale-90 shrink-0" 
              />
            </div>
          </Field>
        </FieldSet>

        {/* SECTION 3: Live Conversion Multipliers Valuation Routing Engine Block */}
        <FieldSet className="mt-4 space-y-4 ">
          <FieldLegend className="flex items-center gap-2 font-semibold text-foreground text-sm border-b  pb-2 w-full ">
            <ArrowLeftRight className="w-4 h-4 text-muted-foreground" /> Base System Exchange Alignment Configuration Vector
          </FieldLegend>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-muted/20 border p-4 rounded-xl mt-2">
            <Field className="md:col-span-5">
              <FieldLabel className="font-bold text-foreground">Exchange Rate Coeffecient Factor Vector *</FieldLabel>
              <div className="relative">
                <Input 
                  type="number" 
                  step="0.00000001" 
                  placeholder="1.00000000" 
                  {...register("exchangeRate", { valueAsNumber: true })} 
                  className="font-mono text-xs font-semibold pl-3 pr-20"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-muted-foreground uppercase font-mono">
                  = 1 Base Units
                </span>
              </div>
              {errors.exchangeRate && <span className="text-xs text-destructive block mt-1">{errors.exchangeRate.message}</span>}
            </Field>

            <Field className="md:col-span-4 flex flex-col justify-end">
              <div className="flex items-center justify-between min-h-9 gap-4 rounded-lg border bg-background px-3 py-1.5 shadow-2xs">
                <div className="space-y-0.5">
                  <FieldLabel className="font-medium text-[11px] block leading-normal text-foreground">
                    Manual Override Lock
                  </FieldLabel>
                  <span className="text-[9px] text-muted-foreground block leading-tight">
                    Isolate row against public tickers updates APIs overrides.
                  </span>
                </div>
                <Switch 
                  checked={watch("isManual")} 
                  onCheckedChange={(val) => setValue("isManual", val, { shouldValidate: true })} 
                  className="scale-90 shrink-0" 
                />
              </div>
            </Field>

            <div className="md:col-span-3 flex flex-col  justify-center">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={syncLatestMarketRates} 
                className="w-full text-xs h-9 gap-1.5 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Call Open Market API
              </Button>
            </div>
          </div>
        </FieldSet>

        {/* Form control actions container */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="text-xs gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} size="sm" className="min-w-[150px] text-xs">
            {isSubmitting ? "Locking financial metrics..." : isEditMode ? "Save Valuation Rules" : "Deploy Currency Profile"}
          </Button>
        </div>

      </FieldGroup>
    </form>
  );
}