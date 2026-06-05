import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

export type AppUser = NonNullable<Awaited<ReturnType<typeof getOrCreateAppUser>>>;

export const getOrCreateAppUser = cache(async function getOrCreateAppUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await db.user.findUnique({ where: { clerkId: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  // Email already exists under a different clerkId (e.g. dev→prod key switch).
  // Re-link the clerkId so the existing profile is not orphaned.
  const byEmail = await db.user.findUnique({ where: { email } });
  if (byEmail) {
    return db.user.update({
      where: { email },
      data: { clerkId: userId },
    });
  }

  return db.user.create({
    data: {
      clerkId: userId,
      email,
      displayName: clerkUser?.firstName ?? null,
    },
  });
});
