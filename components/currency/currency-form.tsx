// components/CurrencyForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { currencySchema, CurrencyInput } from "@/schemas/currency.schema";
import { Button } from "@/components/ui/button";
import { Coins, ArrowLeftRight, ArrowLeft, RefreshCw, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { mutate } from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormInput } from "../shared/form-input";
import { FormSelect } from "../shared/form-select";
import { FormSwitch } from "../shared/form-switch";

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

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;

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

    const formatted = watchedIsFirst ? `${watchedSymbol} ${baseDigits}` : `${baseDigits} ${watchedSymbol}`;

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
      
      // 1. Tell SWR globally to invalidate the cache for your filtered list API endpoint
      // Using a function allows matching any pagination index or search string wildcard
      mutate((key) => typeof key === "string" && key.startsWith("/api/admin/currencies/filtered"));

      // 2. Safely redirect the user back
      router.push("/dashboard/settings/financial/currencies");
    } catch (err: any) {
      toast.error("Write Aborted", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full text-xs font-medium space-y-6 ">

      <div className="bg-slate-900 rounded-xl p-4 text-white font-mono flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">System Ledger Print Sample Preview</span>
          <div className="text-lg font-bold tracking-tight text-blue-300 mt-1 flex gap-4">
            <div>Positive: <span className="text-white">{generateFormatSample(false)}</span></div>
            <div className="text-rose-400">Negative: <span>{generateFormatSample(true)}</span></div>
          </div>
        </div>
        <div className="text-[10px] text-right text-slate-400 bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
          Base Matrix Tracker: <span className="text-emerald-400 font-bold">1.00000000 {watch("isoCode") || "XYZ"}</span>
        </div>
      </div>
           
      <Card className="shadow-xs">
        <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-primary" /> 
              Forex Currency Definitions Card
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground/80">
              The currency configuration defines how the system will display and process monetary values. Ensure that the ISO code is correct for accurate exchange rate tracking.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4" >
          <FormInput
            name="isoCode"
            control={control}
            label="Unique 3-Letter ISO Code"
            placeholder="e.g., EUR, JPY, GBP"
            classNameLabel="text-muted-foreground font-semibold"
            required
          />
          <FormInput
            name="name"
            control={control}
            label="Currency System Display Title"
            placeholder="e.g., Euro Member Token, British Pound Sterling"
            classNameLabel="text-muted-foreground font-semibold"
            required
          />
          <FormSelect
            name="symbol"
            control={control}
            label="Trading Settlement Currency Anchor"
            placeholder="-- Choose Currency Matrix Hub --"
            options={POPULAR_CURRENCIES.map((cur) => ({
              id: cur.code,
              name: `${cur.symbol} - ${cur.code} (${cur.name})`,
            }))}
            classNameLabel="text-muted-foreground font-semibold"
          />
         

        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left */}
        <div className=" space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  Forex Currency Formatting & Display Rules
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground/80">
                  These settings control how the currency is displayed in the system, including decimal precision, separators, and negative number formatting.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4" >
              <FormInput
                name="decimalSeparator"
                control={control}
                label="Decimal Separator Token"
                placeholder="e.g., ."
                classNameLabel="text-muted-foreground font-semibold"
                required
              />
              <FormInput
                name="thousandsSeparator"
                control={control}
                label="Thousands Separator Token"
                placeholder="e.g., ,"
                classNameLabel="text-muted-foreground font-semibold"
                required
              />
              <FormInput
                name="decimalPlaces"
                control={control}
                label="Decimal Precision Capping"
                placeholder="e.g., 2"
                type="number"
                classNameLabel="text-muted-foreground font-semibold"
                required
              />
              <FormSelect
                name="negativeType"
                control={control}
                label="Negative Number Display Style"
                placeholder="-- Choose Negative Display Style --"
                options={[
                  { id: "Leading", name: "Leading Negative Sign (-123.45)" },
                  { id: "Trailing", name: "Trailing Negative Sign (123.45-)" },
                  { id: "Parentheses", name: "Parentheses Style ((123.45))" },
                ]}
                emptyMessage="No negative display styles available"
                classNameLabel="text-muted-foreground font-semibold"
              />

            </CardContent>
          </Card>
        </div>
        {/* Right */}
        <div className=" space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-3 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-primary" />
                  Forex Currency Exchange Rate & Market Feed
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground/80">
                  The exchange rate is relative to the USD base currency. You can manually set the rate or fetch the latest market data.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={syncLatestMarketRates}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Fetch Market Rate
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1  gap-4" >
              <FormInput
                name="exchangeRate"
                control={control}
                label="Exchange Rate (relative to USD)"
                placeholder="e.g., 1.00000000"
                type="number"
                step="0.00000001"
                classNameLabel="text-muted-foreground font-semibold"
                required
              />
              <FormSwitch
                name="isManual"
                control={control}
                variant="card"
                label="Manual Rate Override"
                description="If enabled, the exchange rate will not be auto-updated from market feeds."
                className="p-2.5"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Processing..." : isEditMode ? "Update Scheme" : "Create Scheme"}
        </Button>
      </div>
    </form>
  );
}