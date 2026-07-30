import { db } from "@/lib/db";

/**
 * Generate a unique portfolio slug from display name
 * Handles collisions by appending -2, -3, etc.
 *
 * @param displayName User's display name (e.g. "Alice Smith")
 * @returns Unique slug (e.g. "alice-smith" or "alice-smith-2")
 */
export async function generateUniqueSlug(displayName: string): Promise<string> {
  const base = displayName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!base) return "user-" + Math.random().toString(36).substring(7);

  let slug = base;
  let counter = 2;

  while (await db.careerPortfolio.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
}
