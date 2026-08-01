/**
 * Seed learning-path modules and their quizzes.
 *
 * Module, Quiz and QuizQuestion were all empty in production while
 * /paths/[slug]/modules/[moduleId] rendered quizzes — every path had labs but
 * no taught content, so the module route was unreachable in practice.
 *
 * Most of these attach to paths that already exist. Filling a shell is worth
 * more than publishing a near-duplicate path beside it, so only genuinely new
 * topics create a new LearningPath row.
 *
 * Separate from scripts/seed-learning-paths.ts, which wires capstones.
 *
 * Idempotent: modules upsert on (pathId, order). Quiz questions are replaced
 * wholesale rather than diffed — leaving an orphaned question attached to a
 * live quiz would silently change its scoring.
 *
 * Usage: npm run seed:modules [-- --refresh]
 */

import { PrismaClient } from "@prisma/client";
import { LEARNING_PATHS } from "../src/content/learning-paths";
import { ADVANCED_PATHS } from "../src/content/learning-paths-advanced";

const ALL_PATHS = [...LEARNING_PATHS, ...ADVANCED_PATHS];

const db = new PrismaClient();
const REFRESH = process.argv.includes("--refresh");

async function main() {
  console.log("\nSeeding path modules and quizzes\n");

  let pathsCreated = 0;
  let modulesCreated = 0;
  let modulesUpdated = 0;
  let questionsWritten = 0;

  // New paths append after whatever ordering already exists.
  const maxOrder = await db.learningPath.aggregate({ _max: { order: true } });
  let nextOrder = (maxOrder._max.order ?? 0) + 1;

  for (const seed of ALL_PATHS) {
    let path = await db.learningPath.findUnique({
      where: { slug: seed.slug },
      select: { id: true },
    });

    if (!path) {
      path = await db.learningPath.create({
        data: {
          slug: seed.slug,
          title: seed.title,
          description: seed.description,
          order: nextOrder++,
          published: true,
        },
        select: { id: true },
      });
      pathsCreated++;
      console.log(`  new path   ${seed.slug}`);
    }

    for (const [i, m] of seed.modules.entries()) {
      const order = i + 1;

      const existing = await db.module.findUnique({
        where: { pathId_order: { pathId: path.id, order } },
        select: { id: true },
      });

      if (existing && !REFRESH) continue;

      const moduleRow = existing
        ? await db.module.update({
            where: { id: existing.id },
            data: {
              title: m.title,
              overview: m.overview,
              readingMaterial: m.readingMaterial,
              published: true,
            },
            select: { id: true },
          })
        : await db.module.create({
            data: {
              pathId: path.id,
              order,
              title: m.title,
              overview: m.overview,
              readingMaterial: m.readingMaterial,
              isRequired: true,
              published: true,
            },
            select: { id: true },
          });

      if (existing) modulesUpdated++;
      else modulesCreated++;

      // Quiz is 1:1 with its module.
      const quiz = await db.quiz.upsert({
        where: { moduleId: moduleRow.id },
        create: {
          moduleId: moduleRow.id,
          title: m.quiz.title,
          passMark: m.quiz.passMark,
        },
        update: { title: m.quiz.title, passMark: m.quiz.passMark },
        select: { id: true },
      });

      await db.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
      await db.quizQuestion.createMany({
        data: m.quiz.questions.map((q, qi) => ({
          quizId: quiz.id,
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          order: qi + 1,
        })),
      });
      questionsWritten += m.quiz.questions.length;
    }
  }

  // Surface any path still without modules: it renders as an empty page, which
  // is worse than not listing it.
  const shells = await db.learningPath.findMany({
    where: { published: true, modules: { none: {} } },
    select: { slug: true },
  });

  const totals = {
    paths: await db.learningPath.count({ where: { published: true } }),
    modules: await db.module.count({ where: { published: true } }),
    quizzes: await db.quiz.count(),
    questions: await db.quizQuestion.count(),
  };

  console.log(`\nPaths created:  ${pathsCreated}`);
  console.log(`Modules:        ${modulesCreated} created, ${modulesUpdated} updated`);
  console.log(`Questions:      ${questionsWritten} written`);

  if (shells.length > 0) {
    console.log(`\n${shells.length} path(s) still have no modules and will render empty:`);
    for (const s of shells) console.log(`  ${s.slug}`);
  }

  console.log(
    `\nNow live — paths ${totals.paths}, modules ${totals.modules}, quizzes ${totals.quizzes}, questions ${totals.questions}\n`,
  );

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Path module seed failed:", err);
  await db.$disconnect();
  process.exit(1);
});
