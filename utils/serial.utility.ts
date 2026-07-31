// utils\serial.utility.ts
export interface BinWithSerialCapacity {
  sublocationId: string;
  quantity: number;
  serials?: string[];
}

export interface AutofillSerialOptions {
  prefix?: string;
  suffix?: string;
  startingIndex?: number;
  digitPadding?: number;
}

/**
 * Generates an array of sequential serial numbers.
 * Example: generateSequentialSerials(3, { prefix: "SN-", startingIndex: 1, digitPadding: 4 })
 * Output: ["SN-0001", "SN-0002", "SN-0003"]
 */
export function generateSequentialSerials(
  count: number,
  options: AutofillSerialOptions = {}
): string[] {
  const {
    prefix = "SN-",
    suffix = "",
    startingIndex = 1,
    digitPadding = 4,
  } = options;

  if (count <= 0) return [];

  const generated: string[] = [];

  for (let i = 0; i < count; i++) {
    const numStr = String(startingIndex + i).padStart(digitPadding, "0");
    generated.push(`${prefix}${numStr}${suffix}`);
  }

  return generated;
}

/**
 * Filters generated candidates against an existing set of serials (both local state & DB)
 * to ensure no duplicate serials are added.
 */
export function filterUniqueSerials(
  candidates: string[],
  existingSerials: string[]
): string[] {
  const existingSet = new Set(existingSerials.map((s) => s.trim().toUpperCase()));
  const uniqueList: string[] = [];
  const seenInCandidates = new Set<string>();

  for (const raw of candidates) {
    const clean = raw.trim();
    const upper = clean.toUpperCase();

    if (clean.length > 0 && !existingSet.has(upper) && !seenInCandidates.has(upper)) {
      seenInCandidates.add(upper);
      uniqueList.push(clean);
    }
  }

  return uniqueList;
}

/**
 * Automatically distributes master serial numbers across mapped storage bins
 * up to each bin's specified quantity limit.
 */
export function autoDistributeSerialsToBins<T extends BinWithSerialCapacity>(
  bins: T[],
  masterSerials: string[]
): T[] {
  let serialIndex = 0;

  return bins.map((bin) => {
    const targetQty = Math.max(0, Number(bin.quantity) || 0);
    const assignedSerials: string[] = [];

    while (
      assignedSerials.length < targetQty &&
      serialIndex < masterSerials.length
    ) {
      assignedSerials.push(masterSerials[serialIndex]);
      serialIndex++;
    }

    return {
      ...bin,
      serials: assignedSerials,
    };
  });
}