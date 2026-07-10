/**
 * Resolves standard formatting rules based on a currency ISO code.
 */
export function getCurrencyFormattingRules(isoCode: string): {
  isSymbolFirst: boolean;
  negativeType: "Leading" | "Trailing" | "Parentheses";
} {
  const code = isoCode?.trim().toUpperCase();

  // Currencies that traditionally place the symbol AFTER the number (e.g., 10.00 €)
  const symbolLastCodes = new Set([
    "EUR", "SEK", "NOK", "DKK", "RUB", "PLN", "HUF", "CZK", "RON", "BGN"
  ]);

  // Currencies that commonly use Parentheses for negative values in accounting formats
  const parenthesesNegativeCodes = new Set([
    "USD", "CAD", "GBP", "AUD"
  ]);

  return {
    // Default to true unless explicitly known to be placed last
    isSymbolFirst: !symbolLastCodes.has(code),
    
    // Choose Parentheses for primary accounting markets; default to your fallback "Leading"
    negativeType: parenthesesNegativeCodes.has(code) ? "Parentheses" : "Leading",
  };
}