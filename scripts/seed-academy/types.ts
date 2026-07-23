// Shared types for Academy content seed files.

export type KCOption = { id: string; text: string };

export type SeedBlock =
  | { type: "TEXT"; text: string }
  | { type: "CODE"; language?: string; code: string; caption?: string }
  | { type: "CALLOUT"; variant: "info" | "warning" | "tip" | "danger" | "important"; title?: string; text: string }
  | { type: "KNOWLEDGE_CHECK"; question: string; options: KCOption[]; correct: string; explanation?: string };

export type SeedFlashcard = { front: string; back: string };

export type SeedLesson = {
  title: string;
  summary?: string;
  durationMin: number;
  blocks: SeedBlock[];
  flashcards?: SeedFlashcard[];
};

export type SeedQuestion = {
  type: "MULTIPLE_CHOICE" | "MULTIPLE_SELECT" | "TRUE_FALSE" | "FILL_BLANK";
  question: string;
  options?: string[];          // for MCQ / multi-select
  correct: string | string[];  // option text (or "true"/"false", or the fill-blank answer)
  explanation?: string;
};

export type SeedModule = {
  title: string;
  description?: string;
  lessons: SeedLesson[];
  quiz?: { title: string; passMark?: number; questions: SeedQuestion[] };
};

export type SeedCourse = {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  category: "FUNDAMENTALS" | "BLUE_TEAM" | "RED_TEAM" | "FORENSICS" | "SECURITY_ENGINEERING" | "NETWORKING" | "CLOUD";
  difficulty: "EASY" | "MEDIUM" | "HARD" | "INSANE";
  estimatedHrs: number;
  order: number;
  prerequisites: string[]; // course slugs
  objectives: string[];
  modules: SeedModule[];
};
