/**
 * Seed additional Academy courses, modules and lessons.
 *
 * Idempotent: courses upsert on slug, modules on (courseId, order), lessons on
 * (moduleId, order).
 *
 * Reports any published course with no modules, and any module with no
 * lessons — both render as an empty page, which is the failure mode worth
 * catching before a learner finds it.
 *
 * Usage: npm run seed:academy-courses [-- --refresh]
 */

import { PrismaClient } from "@prisma/client";
import { ACADEMY_COURSES } from "../src/content/academy-courses";

const db = new PrismaClient();
const REFRESH = process.argv.includes("--refresh");

async function main() {
  console.log("\nSeeding Academy courses\n");

  const maxOrder = await db.academyCourse.aggregate({ _max: { order: true } });
  let nextOrder = (maxOrder._max.order ?? 0) + 1;

  let coursesCreated = 0;
  let modulesCreated = 0;
  let lessonsCreated = 0;

  for (const seed of ACADEMY_COURSES) {
    const existingCourse = await db.academyCourse.findUnique({
      where: { slug: seed.slug },
      select: { id: true },
    });

    const course = existingCourse
      ? await db.academyCourse.update({
          where: { id: existingCourse.id },
          data: {
            title: seed.title,
            subtitle: seed.subtitle,
            description: seed.description,
            category: seed.category,
            difficulty: seed.difficulty,
            estimatedHrs: seed.estimatedHrs,
            prerequisites: seed.prerequisites,
            objectives: seed.objectives,
            published: true,
          },
          select: { id: true },
        })
      : await db.academyCourse.create({
          data: {
            slug: seed.slug,
            title: seed.title,
            subtitle: seed.subtitle,
            description: seed.description,
            category: seed.category,
            difficulty: seed.difficulty,
            estimatedHrs: seed.estimatedHrs,
            prerequisites: seed.prerequisites,
            objectives: seed.objectives,
            order: nextOrder++,
            published: true,
          },
          select: { id: true },
        });

    if (!existingCourse) {
      coursesCreated++;
      console.log(`  new course  ${seed.slug}`);
    }

    for (const [mi, m] of seed.modules.entries()) {
      const moduleOrder = mi + 1;

      const existingModule = await db.academyModule.findUnique({
        where: { courseId_order: { courseId: course.id, order: moduleOrder } },
        select: { id: true },
      });

      if (existingModule && !REFRESH) continue;

      const moduleRow = existingModule
        ? await db.academyModule.update({
            where: { id: existingModule.id },
            data: { title: m.title, description: m.description, published: true },
            select: { id: true },
          })
        : await db.academyModule.create({
            data: {
              courseId: course.id,
              order: moduleOrder,
              title: m.title,
              description: m.description,
              published: true,
            },
            select: { id: true },
          });

      if (!existingModule) modulesCreated++;

      for (const [li, lesson] of m.lessons.entries()) {
        const lessonOrder = li + 1;

        const existingLesson = await db.academyLesson.findUnique({
          where: { moduleId_order: { moduleId: moduleRow.id, order: lessonOrder } },
          select: { id: true },
        });

        if (existingLesson) {
          await db.academyLesson.update({
            where: { id: existingLesson.id },
            data: {
              title: lesson.title,
              summary: lesson.summary,
              durationMin: lesson.durationMin,
              published: true,
            },
          });
          continue;
        }

        await db.academyLesson.create({
          data: {
            moduleId: moduleRow.id,
            order: lessonOrder,
            title: lesson.title,
            summary: lesson.summary,
            durationMin: lesson.durationMin,
            published: true,
          },
        });
        lessonsCreated++;
      }
    }
  }

  const emptyCourses = await db.academyCourse.findMany({
    where: { published: true, modules: { none: {} } },
    select: { slug: true },
  });
  const emptyModules = await db.academyModule.findMany({
    where: { published: true, lessons: { none: {} } },
    select: { title: true, course: { select: { slug: true } } },
  });

  const totals = {
    courses: await db.academyCourse.count({ where: { published: true } }),
    modules: await db.academyModule.count({ where: { published: true } }),
    lessons: await db.academyLesson.count({ where: { published: true } }),
  };

  console.log(`\nCourses: ${coursesCreated} created`);
  console.log(`Modules: ${modulesCreated} created`);
  console.log(`Lessons: ${lessonsCreated} created`);

  if (emptyCourses.length > 0) {
    console.log(`\n${emptyCourses.length} published course(s) with no modules:`);
    for (const c of emptyCourses) console.log(`  ${c.slug}`);
  }
  if (emptyModules.length > 0) {
    console.log(`\n${emptyModules.length} published module(s) with no lessons:`);
    for (const m of emptyModules.slice(0, 10)) {
      console.log(`  ${m.course.slug} / ${m.title}`);
    }
  }

  console.log(
    `\nNow live — courses ${totals.courses}, modules ${totals.modules}, lessons ${totals.lessons}\n`,
  );

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Academy course seed failed:", err);
  await db.$disconnect();
  process.exit(1);
});
