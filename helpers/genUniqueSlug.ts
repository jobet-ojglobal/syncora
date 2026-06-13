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
export const genInflowUniqueSlug = async (text: string, model: any, currentId?: string): Promise<string> => {
  const baseSlug = slugify(text, { lower: true, strict: true, trim: true });
  let slug = baseSlug;

  let counter = 1;

  while (true) {
    const existing = await model.findFirst({
      where: {
        slug,
        NOT: currentId ? { inflowId: currentId } : undefined,
      },
    });

    if (!existing) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
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


