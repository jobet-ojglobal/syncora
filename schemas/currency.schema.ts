// schemas/currency.schema.ts
import { z } from "zod";

export const currencySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Currency descriptive title name is required"),
  isoCode: z.string().length(3, "ISO code must be exactly a 3-letter alphanumeric handle (e.g., USD, EUR, CAD)").toUpperCase(),
  symbol: z.string().min(1, "Display currency glyph symbol token required (e.g., $, €, ₱)"),
  decimalPlaces: z.number().min(0).max(4),
  decimalSeparator: z.string().length(1, "Decimal separator token must be exactly 1 character (e.g., '.')"),
  thousandsSeparator: z.string().length(1, "Thousands grouping character token must be exactly 1 character (e.g., ',')"),
  isSymbolFirst: z.boolean(),
  negativeType: z.enum(["Leading", "Trailing", "Parentheses"]),
  exchangeRate: z.number().min(0.00000001, "Exchange conversion multiplier rate parameter index must scale greater than zero"),
  isManual: z.boolean()
});

export type CurrencyInput = z.infer<typeof currencySchema>;