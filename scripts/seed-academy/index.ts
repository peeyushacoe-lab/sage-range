// Academy content seeder — idempotent per course (upserts course by slug,
// then wipes and recreates its modules/lessons/blocks/quizzes).
// Enrollments and certificates are preserved (they reference the course row).
// Run: npx tsx scripts/seed-academy/index.ts

import { PrismaClient, Prisma } from "@prisma/client";
import type { SeedCourse, SeedQuestion } from "./types";
import { course1 } from "./course-1-fundamentals";
import { course2 } from "./course-2-soc";
import { course3 } from "./course-3-web";
import { course4 } from "./course-4-linux";
import { CHEAT_SHEETS } from "./cheatsheets";

const db = new PrismaClient();

function questionData(q: SeedQuestion, order: number) {
  return {
    type: q.type,
    question: q.question,
    options: (q.options ?? null) as Prisma.InputJsonValue,
    correctAnswer: q.correct as Prisma.InputJsonValue,
    explanation: q.explanation ?? null,
    order,
  };
}

async function seedCourse(c: SeedCourse) {
  const course = await db.academyCourse.upsert({
    where: { slug: c.slug },
    create: {
      slug: c.slug, title: c.title, subtitle: c.subtitle ?? null, description: c.description,
      category: c.category, difficulty: c.difficulty, estimatedHrs: c.estimatedHrs,
      order: c.order, prerequisites: c.prerequisites, objectives: c.objectives, published: true,
    },
    update: {
      title: c.title, subtitle: c.subtitle ?? null, description: c.description,
      category: c.category, difficulty: c.difficulty, estimatedHrs: c.estimatedHrs,
      order: c.order, prerequisites: c.prerequisites, objectives: c.objectives, published: true,
    },
  });

  // Recreate all content under the course (progress rows cascade away on reseed)
  await db.academyModule.deleteMany({ where: { courseId: course.id } });

  for (let mi = 0; mi < c.modules.length; mi++) {
    const m = c.modules[mi];
    const mod = await db.academyModule.create({
      data: { courseId: course.id, title: m.title, description: m.description ?? null, order: mi, published: true },
    });

    for (let li = 0; li < m.lessons.length; li++) {
      const l = m.lessons[li];
      await db.academyLesson.create({
        data: {
          moduleId: mod.id, title: l.title, summary: l.summary ?? null, order: li,
          durationMin: l.durationMin, published: true,
          blocks: {
            create: l.blocks.map((b, bi) => {
              const { type, ...content } = b;
              return { type, order: bi, content: content as Prisma.InputJsonValue };
            }),
          },
          flashcards: {
            create: (l.flashcards ?? []).map((f, fi) => ({ front: f.front, back: f.back, order: fi })),
          },
        },
      });
    }

    if (m.quiz) {
      await db.academyQuiz.create({
        data: {
          moduleId: mod.id, title: m.quiz.title, passMark: m.quiz.passMark ?? 70,
          questions: { create: m.quiz.questions.map((q, qi) => questionData(q, qi)) },
        },
      });
    }
  }

  const lessonCount = c.modules.reduce((s, m) => s + m.lessons.length, 0);
  console.log(`✓ ${c.title} — ${c.modules.length} modules, ${lessonCount} lessons`);
}

async function seedCheatSheets() {
  for (const cs of CHEAT_SHEETS) {
    const existing = await db.academyCheatSheet.findFirst({ where: { title: cs.title } });
    if (existing) {
      await db.academyCheatSheet.update({ where: { id: existing.id }, data: { content: cs.content, description: cs.description, published: true } });
    } else {
      await db.academyCheatSheet.create({ data: { title: cs.title, content: cs.content, description: cs.description, published: true } });
    }
  }
  console.log(`✓ ${CHEAT_SHEETS.length} cheat sheets`);
}

async function main() {
  for (const c of [course1, course2, course3, course4]) {
    await seedCourse(c);
  }
  await seedCheatSheets();
  console.log("Academy seed complete.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
