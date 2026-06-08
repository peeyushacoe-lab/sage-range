import { cache } from "react";
import { auth } from "@/auth";
import { db } from "./db";

export type AppUser = NonNullable<Awaited<ReturnType<typeof getOrCreateAppUser>>>;

export const getOrCreateAppUser = cache(async function getOrCreateAppUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const externalId = session.user.id;   // Keycloak sub claim
  const email = session.user.email;

  const existing = await db.user.findUnique({ where: { externalId } });
  if (existing) return existing;

  if (!email) return null;

  // Email already registered under a different externalId (e.g. Keycloak realm change).
  // Re-link so the existing profile is not orphaned.
  const byEmail = await db.user.findUnique({ where: { email } });
  if (byEmail) {
    return db.user.update({ where: { email }, data: { externalId } });
  }

  return db.user.create({
    data: {
      externalId,
      email,
      displayName: session.user.name ?? null,
    },
  });
});
