export function generateSkuSlug(text: string): string {
  const clean = text.trim().replace(/[^a-zA-Z0-9\s-]/g, ""); // Remove special characters
  const words = clean.split(/[\s-]+/).filter(Boolean);

  if (words.length === 1) {
    const singleWord = words[0].toUpperCase();
    // If it's a short word, keep it; if long, truncate to 3 letters (e.g., "Black" -> "BLA")
    return singleWord.length <= 4 ? singleWord : singleWord.slice(0, 3);
  }

  // If multi-word (e.g., "Fully Assembled"), grab initials: "FA"
  // If it contains numbers (e.g. "Q1 Pro"), keep numbers: "Q1P"
  return words
    .map(word => {
      const upper = word.toUpperCase();
      const match = upper.match(/[0-9]+/); // Preserve numbers if they exist
      return match ? match[0] + upper.charAt(0) : upper.charAt(0);
    })
    .join("")
    .replace(/[^A-Z0-9]/g, "") // Ensure clean alphanumeric string
    .slice(0, 4); // Keep slugs reasonably compact
}