/** Block types stored in learning_modules.module_type — reusable across LMS and future wiki/courses. */
export const LEARNING_BLOCK_TYPES = [
  "rich_text",
  "flash_cards",
  "short_message",
  "quiz",
  "video",
  "image_gallery",
  "micro_lesson",
  "executive_summary",
  "on_the_job",
  "reflection",
  "checklist",
] as const;

export type LearningBlockType = (typeof LEARNING_BLOCK_TYPES)[number];

export type CourseScope = "organization" | "system_default";

export type LearningCourseRow = {
  id: string;
  organization_id: string | null;
  slug: string;
  title: Record<string, string> | null;
  description: Record<string, string> | null;
  published: boolean;
  scope: CourseScope;
  created_at: string;
};

export type LearningModuleRow = {
  id: string;
  course_id: string;
  position: number;
  module_type: LearningBlockType;
  content: Record<string, unknown>;
};

export type RichTextContent = {
  paragraphs?: { text: string }[];
};

export type FlashCardsContent = {
  cards?: { front: string; back: string }[];
};

export type ShortMessageContent = {
  message?: string;
};

export type QuizQuestion = {
  id: string;
  question: string;
  choices: { id: string; label: string }[];
  correctChoiceId: string;
};

export type QuizContent = {
  questions?: QuizQuestion[];
  passPercent?: number;
};

export type VideoContent = {
  url?: string;
  caption?: string;
};

export type ImageGalleryContent = {
  images?: { url: string; caption?: string }[];
};

export type MicroLessonContent = {
  title?: string;
  steps?: { title: string; body: string }[];
};

export type ExecutiveSummaryContent = {
  points?: { text: string }[];
};

export type OnTheJobContent = {
  actions?: { title: string; description: string }[];
};

export type ReflectionContent = {
  prompt?: string;
};

export type ChecklistContent = {
  items?: { id: string; label: string }[];
};
