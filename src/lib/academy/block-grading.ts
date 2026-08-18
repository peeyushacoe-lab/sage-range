/**
 * What a lesson block may tell the browser, and who decides if an answer is right.
 *
 * Lesson blocks are stored as JSON and used to be handed to the client whole.
 * That put the correct option of every knowledge check, and the worked solution
 * of every practice exercise, into the page payload — readable in devtools
 * before answering, which is not a knowledge check at all.
 *
 * The stripping happens here and the marking happens in
 * /api/academy/blocks/[blockId], so the answer only ever travels one way.
 */

import { db } from "@/lib/db";
import { checkPractice, feedbackFor, type PracticeSpec } from "@/lib/practice-check";

/** Fields that must never reach the browser, by block type. */
const WITHHELD: Record<string, string[]> = {
  KNOWLEDGE_CHECK: ["correct", "explanation"],
  PRACTICE: ["requires", "forbids", "solution", "explanation"],
};

/** A block's content with anything that gives the answer away removed. */
export function blockContentForLearner(
  type: string,
  content: Record<string, unknown>,
): Record<string, unknown> {
  const withheld = WITHHELD[type];
  if (!withheld) return content;
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(content)) {
    if (!withheld.includes(key)) safe[key] = value;
  }
  // The progress meter on a practice block needs to know how many elements the
  // answer should contain, without knowing what they are.
  if (type === "PRACTICE") {
    safe.requiredCount = Array.isArray(content.requires) ? content.requires.length : 0;
  }
  return safe;
}

export type KnowledgeCheckResult = {
  kind: "knowledge_check";
  correct: boolean;
  /** Revealed with the verdict, once the learner has committed to an answer. */
  correctOption: string;
  explanation: string | null;
};

export type PracticeResult = {
  kind: "practice";
  correct: boolean;
  status: "correct" | "wrong-approach" | "incomplete" | "empty";
  message: string;
  hints: string[];
  offerSolution: boolean;
  /** How much of the required shape is present, for the meter. */
  progress: number;
  /** Only when the learner has earned it by trying. */
  solution?: string;
  explanation?: string;
};

export type BlockGradeResult = KnowledgeCheckResult | PracticeResult | { kind: "unsupported" };

/**
 * Mark one submission against the stored block.
 *
 * `attempts` is what the learner's page has counted. It only decides when the
 * worked solution is offered, which they could reach anyway by pressing Check
 * twice — so trusting it costs nothing, while the requirements it is compared
 * against stay here.
 */
export async function gradeBlock(
  blockId: string,
  answer: string,
  attempts: number,
): Promise<BlockGradeResult | null> {
  const block = await db.academyLessonBlock.findUnique({
    where: { id: blockId },
    select: { type: true, content: true },
  });
  if (!block) return null;

  const content = block.content as Record<string, unknown>;

  if (block.type === "KNOWLEDGE_CHECK") {
    const correctOption = String(content.correct ?? "");
    return {
      kind: "knowledge_check",
      correct: answer === correctOption,
      correctOption,
      explanation: content.explanation ? String(content.explanation) : null,
    };
  }

  if (block.type === "PRACTICE") {
    const spec: PracticeSpec = {
      requires: (content.requires as string[] | undefined) ?? [],
      forbids: (content.forbids as string[] | undefined) ?? [],
    };
    const feedback = feedbackFor(answer, spec, attempts);
    const earned = feedback.offerSolution || feedback.status === "correct";
    return {
      kind: "practice",
      correct: feedback.status === "correct",
      status: feedback.status,
      message: feedback.message,
      hints: feedback.hints,
      offerSolution: feedback.offerSolution,
      progress: checkPractice(answer, spec).progress,
      solution: earned ? String(content.solution ?? "") : undefined,
      explanation: earned ? String(content.explanation ?? "") : undefined,
    };
  }

  return { kind: "unsupported" };
}
