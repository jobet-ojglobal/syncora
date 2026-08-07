import slugify from "slugify";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const genUniqueSlug = async (text: string, model: any, currentId?: string): Promise<string> => {
  const baseSlug = slugify(text, { lower: true, strict: true, trim: true });
  let slug = baseSlug;

  let counter = 1;

  while (true) {
    const existing = await model.findFirst({
      where: {
        slug,
        NOT: currentId ? { id: currentId } : undefined,
      },
    });

    if (!existing) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */
// export const genInflowUniqueSlug = async (text: string, model: any, currentId?: string): Promise<string> => {
//   const baseSlug = slugify(text, { lower: true, strict: true, trim: true });
//   let slug = baseSlug;

//   let counter = 1;

//   while (true) {
//     const existing = await model.findFirst({
//       where: {
//         slug,
//         NOT: currentId ? { inflowId: currentId } : undefined,
//       },
//     });

//     if (!existing) break;

//     slug = `${baseSlug}-${counter}`;
//     counter++;
//   }

//   return slug;
// };

export const genInflowUniqueSlug = async (
  text: string, 
  model: any, 
  currentId?: string
): Promise<string> => {
  const baseSlug = slugify(text, { lower: true, strict: true, trim: true }) || "product";
  let slug = baseSlug;

  let counter = 1;

  while (true) {
    const existing = await model.findFirst({
      where: {
        slug,
        NOT: currentId ? { inflowId: currentId } : undefined,
      },
      select: { inflowId: true },
    });

    if (!existing) break;

    // Append counter first; if multiple collisions occur, append a sliced ID snippet
    if (counter > 5 && currentId) {
      const idSnippet = currentId.slice(-6);
      slug = `${baseSlug}-${idSnippet}-${counter}`;
    } else {
      slug = `${baseSlug}-${counter}`;
    }
    
    counter++;
  }

  return slug;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */
export const genLocalUniqueSlug = async (
  text: string,
  model: any,
  currentInflowId: string,
): Promise<string> => {
  const baseSlug = slugify(text, { lower: true, strict: true, trim: true }) || "product";

  // Find all existing slugs that match the base slug pattern
  const existingRecords: Array<{ slug: string }> = await model.findMany({
    where: {
      slug: {
        startsWith: baseSlug,
      },
      // Exclude the current record if we are updating an existing item
      NOT: { inflowId: currentInflowId }
    },
    select: { slug: true },
  });

  if (existingRecords.length === 0) {
    return baseSlug;
  }

  const existingSlugs = new Set(existingRecords.map((r) => r.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  // Find the next available numerical index
  let counter = 1;
  while (existingSlugs.has(`${baseSlug}-${counter}`)) {
    counter++;
  }

  return `${baseSlug}-${counter}`;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
