

const SKU_MAP: Record<string, string> = {
 " SILVER GREY": "GRY",
 "FULLY ASSEMBLED": "FA",
  BAREBONE: "BB",
  BAREBONES: "BB",
  GREY: "GRY",
  GRAY: "GRY",
  SILVER: "SLV",
  BLACK: "BLK",
  WHITE: "WHT",
  RED: "RED",
  BLUE: "BLU",
};


// =========== SKU 1 =============

function generateSegment(text: string): string {
  const clean = text.trim().replace(/[^a-zA-Z0-9\s-]/g, "");
  const words = clean.split(/[\s-]+/).filter(Boolean);

  if (!words.length) return "";

  if (words.length === 1) {
    const word = words[0].toUpperCase();

    // Preserve model numbers like Q1
    if (/^[A-Z]+\d+$/.test(word)) {
      return word;
    }

    return word.length <= 3 ? word : word.slice(0, 3);
  }

  return words
    .map(word => {
      const upper = word.toUpperCase();

      // Keep full model-like tokens (Q1, K8, M3)
      if (/^[A-Z]+\d+$/.test(upper)) {
        return upper;
      }

      return upper[0];
    })
    .join("")
    .slice(0, 4);
}


// =========== SKU 1 =============

export function generateSku(
  brand: string,
  productName: string,
  ...variants: string[]
): string {
  return [
    generateSegment(brand),
    generateSegment(productName),
    ...variants.map(generateSegment),
  ]
    .filter(Boolean)
    .join("-");
}

// USAGE 

const sku = generateSku(
  "Keychron",
  "Q1 Pro",
  "Barebone",
  "Silver Grey"
);

// =========== SKU 2 =============

export function generateSku2(
  brand: string,
  productName: string,
  variants: string[]
): string {
  const brandCode = brand.toUpperCase();

  const productCode = productName
    .split(/\s+/)
    .map(w => {
      const upper = w.toUpperCase();
      return /^[A-Z]+\d+$/.test(upper) ? upper : upper[0];
    })
    .join("");

  return [
    brandCode,
    productCode,
    ...variants.map(variantCode),
  ].join("-");
}

generateSku2(
  "Keychron",
  "Q1 Pro",
  ["Barebone", "Grey"]
);

// KEYCHRON-Q1P-BB-GRY


// =========== SKU 2 USING Variant 2 =============

export function generateSku2Variant2(
  brand: string,
  productName: string,
  variants: string[]
): string {
  const brandCode = brand.toUpperCase();

  const productCode = productName
    .split(/\s+/)
    .map(w => {
      const upper = w.toUpperCase();
      return /^[A-Z]+\d+$/.test(upper) ? upper : upper[0];
    })
    .join("");

  return [
    brandCode,
    productCode,
    ...variants.map(variantCode2),
  ].join("-");
}

generateSku2Variant2(
  "Keychron",
  "Q1 Pro",
  ["Barebone", "Silver Grey"]
);

// KEYCHRON-Q1P-BB-SLVRGRY

// Clean (preventing leading, trailing, or double dashes)
export function generateSku2Variant2V2(
  brand: string,
  productName: string,
  variants: string[]
): string {
  // 1. Convert brand code (or empty string if non-existent)
  const brandCode = brand?.trim().toUpperCase() || "";

  // 2. Generate product code
  const productCode = productName
    ? productName
        .trim()
        .split(/\s+/)
        .map(w => {
          const upper = w.toUpperCase();
          return /^[A-Z]+\d+$/.test(upper) ? upper : upper[0];
        })
        .join("")
    : "";

  // 3. Process variants, filtering out empty results
  const variantCodes = variants
    .map(variantCode2)
    .filter(v => Boolean(v && v.trim()));

  // 4. Combine parts and filter out any empty string items before joining
  return [brandCode, productCode, ...variantCodes]
    .filter(part => Boolean(part && part.trim()))
    .join("-");
}

generateSku2Variant2V2(
  "",
  "Q1 Pro",
  []
);

export function generateSku2Variant2V2G(
  brand: string,
  productName: string,
  variants: string[] = []
): string {
  const cleanBrand = brand?.trim() || "";
  let cleanedName = productName?.trim() || "";

  // 1. Remove brand from productName if it starts with or contains the brand (case-insensitive)
  if (cleanBrand && cleanedName) {
    const brandRegex = new RegExp(`\\b${escapeRegExp(cleanBrand)}\\b`, "gi");
    cleanedName = cleanedName.replace(brandRegex, "").trim();
  }

  // 2. Extract product model/name parts, cleaning up leftover extra spaces or hyphens
  const productCode = cleanedName
    ? cleanedName
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.toUpperCase())
        .join("-")
    : "";

  // 3. Process variants (clean and uppercase whole words)
  const variantCodes = variants
    .map((v) => v?.trim().toUpperCase())
    .filter((v): v is string => Boolean(v));

  // 4. Combine all parts with hyphens
  return [cleanBrand.toUpperCase(), productCode, ...variantCodes]
    .filter(Boolean)
    .join("-");
}

export function generateSku2Variant2V2GNoSpace(
  brand: string,
  productName: string,
  variants: string[] = [],
  separator: string = "-"
): string {
  // 1. Normalize and collapse spaces in brand
  const cleanBrand = brand ? brand.trim().replace(/\s+/g, " ") : "";
  let cleanedName = productName ? productName.trim().replace(/\s+/g, " ") : "";

  // 2. Remove multi-word brand name from product name if present (case-insensitive)
  if (cleanBrand && cleanedName) {
    const brandRegex = new RegExp(`\\b${escapeRegExp(cleanBrand)}\\b`, "gi");
    cleanedName = cleanedName.replace(brandRegex, "").trim();
  }

  // 3. Extract and format brand code (e.g. "Weifeng One" -> "WEIFENG-ONE")
  const brandCode = cleanBrand
    ? cleanBrand.split(/\s+/).map((w) => w.toUpperCase()).join("-")
    : "";

  // 4. Extract product name/model parts, replacing spaces with hyphens
  const productCode = cleanedName
    ? cleanedName
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.toUpperCase())
        .join(separator)
    : "";

  // 5. Clean up each variant (trim, collapse internal spaces to hyphens, uppercase)
  const variantCodes = variants
    .map((v) =>
      v
        ? v
            .trim()
            .replace(/\s+/g, "-") // Convert spaces inside variants to hyphens (e.g., "Dark Blue" -> "DARK-BLUE")
            .toUpperCase()
        : ""
    )
    .filter((v): v is string => Boolean(v));

  // 6. Combine all non-empty sections
  return [brandCode, productCode, ...variantCodes]
    .filter(Boolean)
    .join("-");
}

// Helper to escape special regex characters in brand names (e.g., "A&B", "Brand+")
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =========== SKU 2 USING Variant 2 =============

export function generateSku2Variant3(
  brand: string,
  productName: string,
  variants: string[]
): string {
  const brandCode = brand.toUpperCase();

  const productCode = productName
    .split(/\s+/)
    .map(w => {
      const upper = w.toUpperCase();
      return /^[A-Z]+\d+$/.test(upper) ? upper : upper[0];
    })
    .join("");

  return [
    brandCode,
    productCode,
    ...variants.map(variantCode3),
  ].join("-");
}

generateSku2Variant3(
  "Keychron",
  "Q1 Pro",
  ["Barebone", "Silver Grey"]
);

// KEYCHRON-Q1P-BB-GRY


// =============== VARIANT CODE 1 ================


function variantCode(text: string): string {
  const words = text.trim().split(/\s+/);

  if (words.length > 1) {
    // Silver Grey -> GRY (special color mapping can override)
    return words.map(w => w[0]).join("").toUpperCase();
  }

  const word = words[0].toUpperCase();

  // Barebone -> BB
  if (word === "BAREBONE" || word === "BAREBONES") {
    return "BB";
  }

  // Grey -> GRY
  if (word === "GREY" || word === "GRAY") {
    return "GRY";
  }

  return word.slice(0, 3);
}


// =============== VARIANT CODE 2 ================

function variantCode2(text: string): string {
  const normalized = text.trim().toUpperCase();

  // Exact match override
  if (SKU_MAP[normalized]) {
    return SKU_MAP[normalized];
  }

  const words = normalized.split(/\s+/);

  // Multi-word variant
  if (words.length > 1) {
    return words
      .map(word => SKU_MAP[word] || word.charAt(0))
      .join("")
      .slice(0, 4);
  }

  // Fallback
  return normalized.slice(0, 3);
}

// =============== VARIANT CODE 3  ================
// specific business-defined abbreviations

function variantCode3(text: string): string {
  const normalized = text.trim().toUpperCase();

  // Phrase match first
  if (SKU_MAP[normalized]) {
    return SKU_MAP[normalized];
  }

  const words = normalized.split(/\s+/);

  return words.map(word => word[0]).join("");
}