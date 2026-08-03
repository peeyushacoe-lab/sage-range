/**
 * Seed Academy lesson content blocks.
 *
 * The courses, modules and lessons already exist; this fills in the blocks
 * that make a lesson worth opening. Fifty-five lessons had a title and a
 * summary and nothing else, which renders as a heading with no teaching.
 *
 * Matching is by title within (course slug, module order, lesson order), so
 * content is attached to the lesson it was written for rather than by position
 * alone. A mismatch is reported rather than silently attaching prose to the
 * wrong lesson.
 *
 * Blocks are replaced wholesale per lesson: they are authored content with no
 * user data attached, and a partial diff risks leaving stale blocks interleaved
 * with new ones.
 *
 * Usage: npm run seed:academy-content
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { ACADEMY_CONTENT, expandBlock, FLASHCARDS } from "../src/content/academy";

const db = new PrismaClient();

async function main() {
  console.log("\nSeeding Academy lesson content\n");

  let lessonsFilled = 0;
  let blocksWritten = 0;
  let cardsWritten = 0;
  const mismatches: string[] = [];
  const missing: string[] = [];

  for (const course of ACADEMY_CONTENT) {
    const dbCourse = await db.academyCourse.findUnique({
      where: { slug: course.slug },
      select: {
        id: true,
        modules: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true } },
          },
        },
      },
    });

    if (!dbCourse) {
      missing.push(`course ${course.slug}`);
      continue;
    }

    for (const [mi, mod] of course.modules.entries()) {
      const dbModule = dbCourse.modules[mi];
      if (!dbModule) {
        missing.push(`${course.slug} / module ${mi + 1} (${mod.title})`);
        continue;
      }
      if (dbModule.title !== mod.title) {
        mismatches.push(
          `${course.slug} module ${mi + 1}: db "${dbModule.title}" vs content "${mod.title}"`,
        );
      }

      for (const [li, les] of mod.lessons.entries()) {
        const dbLesson = dbModule.lessons[li];
        if (!dbLesson) {
          missing.push(`${course.slug} / ${mod.title} / lesson ${li + 1} (${les.title})`);
          continue;
        }
        if (dbLesson.title !== les.title) {
          mismatches.push(
            `${course.slug} / ${mod.title} lesson ${li + 1}: db "${dbLesson.title}" vs content "${les.title}"`,
          );
        }

        // Keep the lesson's own metadata in step with the authored version.
        await db.academyLesson.update({
          where: { id: dbLesson.id },
          data: {
            summary: les.summary,
            durationMin: les.durationMin,
            published: true,
          },
        });

        await db.academyLessonBlock.deleteMany({ where: { lessonId: dbLesson.id } });
        await db.academyLessonBlock.createMany({
          data: les.blocks.map((b, i) => {
            const { type, content } = expandBlock(b);
            // Prisma types JSON columns as InputJsonValue; the expanded block is
            // a plain object, so this narrows rather than silences.
            return {
              lessonId: dbLesson.id,
              type,
              order: i + 1,
              content: content as Prisma.InputJsonObject,
            };
          }),
        });

        // Flashcards for this lesson, if the deck has any.
        //
        // Replaced rather than merged, like blocks — but only when the deck
        // actually supplies cards. A lesson absent from the deck keeps whatever
        // cards it already has, so re-running this cannot wipe an existing
        // course's flashcards along with the learners' schedules for them.
        const deck = FLASHCARDS[course.slug]?.[les.title];
        if (deck?.length) {
          await db.academyFlashcard.deleteMany({ where: { lessonId: dbLesson.id } });
          await db.academyFlashcard.createMany({
            data: deck.map((c, i) => ({
              lessonId: dbLesson.id,
              front: c.front,
              back: c.back,
              order: i + 1,
            })),
          });
          cardsWritten += deck.length;
        }

        lessonsFilled++;
        blocksWritten += les.blocks.length;
      }
    }
  }

  // A deck entry whose lesson title matches nothing writes no cards and would
  // otherwise fail silently.
  const authoredTitles = new Set(
    ACADEMY_CONTENT.flatMap((c) =>
      c.modules.flatMap((m) => m.lessons.map((l) => `${c.slug}::${l.title}`)),
    ),
  );
  for (const [slug, lessons] of Object.entries(FLASHCARDS)) {
    for (const title of Object.keys(lessons)) {
      if (!authoredTitles.has(`${slug}::${title}`)) {
        missing.push(`flashcards for ${slug} / "${title}" — no such lesson`);
      }
    }
  }

  const stillEmpty = await db.academyLesson.findMany({
    where: { blocks: { none: {} } },
    select: { title: true, module: { select: { course: { select: { slug: true } } } } },
  });

  const totals = {
    lessons: await db.academyLesson.count(),
    blocks: await db.academyLessonBlock.count(),
    cards: await db.academyFlashcard.count(),
  };

  console.log(`Lessons filled: ${lessonsFilled}`);
  console.log(`Blocks written: ${blocksWritten}`);
  console.log(`Flashcards written: ${cardsWritten}`);

  if (mismatches.length) {
    console.log(`\n${mismatches.length} title mismatch(es) — content may be attached to the wrong lesson:`);
    for (const m of mismatches.slice(0, 12)) console.log(`  ${m}`);
  }
  if (missing.length) {
    console.log(`\n${missing.length} target(s) not found in the database:`);
    for (const m of missing.slice(0, 12)) console.log(`  ${m}`);
  }
  if (stillEmpty.length) {
    console.log(`\n${stillEmpty.length} lesson(s) still have no content blocks:`);
    for (const l of stillEmpty.slice(0, 15)) {
      console.log(`  ${l.module.course.slug} — ${l.title}`);
    }
  }

  console.log(
    `\nNow live — ${totals.lessons} lessons, ${totals.blocks} content blocks ` +
      `(${(totals.blocks / Math.max(1, totals.lessons)).toFixed(1)} per lesson), ` +
      `${totals.cards} flashcards\n`,
  );

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Academy content seed failed:", err);
  await db.$disconnect();
  process.exit(1);
});
