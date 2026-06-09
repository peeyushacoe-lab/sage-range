import { cache } from "react";
import { auth } from "@/auth";
import { db } from "./db";

export type AppUser = NonNullable<Awaited<ReturnType<typeof getOrCreateAppUser>>>;

export const getOrCreateAppUser = cache(async function getOrCreateAppUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId } });
});
