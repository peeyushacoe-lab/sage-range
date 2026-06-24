import { db } from "./db";

export async function maybeCompletePathFromModule(userId: string, moduleId: string) {
  const mod = await db.module.findUnique({
    where: { id: moduleId },
    select: { pathId: true },
  });
  if (!mod) return;

  const allModules = await db.module.findMany({
    where: { pathId: mod.pathId, published: true },
    select: { id: true },
  });
  if (allModules.length === 0) return;

  const completedProgress = await db.userModuleProgress.findMany({
    where: {
      userId,
      moduleId: { in: allModules.map((m) => m.id) },
      completedAt: { not: null },
    },
  });

  if (completedProgress.length === allModules.length) {
    await db.userPathProgress.upsert({
      where: { userId_pathId: { userId, pathId: mod.pathId } },
      update: { completedAt: new Date() },
      create: { userId, pathId: mod.pathId, completedAt: new Date() },
    });
  }
}
