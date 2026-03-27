import type { LearningBlockType } from "@/lib/learning/types";

function rid() {
  return `id_${Math.random().toString(36).slice(2, 11)}`;
}

export function defaultContentForType(type: LearningBlockType): Record<string, unknown> {
  switch (type) {
    case "rich_text":
      return { paragraphs: [{ text: "" }] };
    case "flash_cards":
      return { cards: [{ front: "", back: "" }] };
    case "short_message":
      return { message: "" };
    case "quiz":
      return {
        passPercent: 70,
        questions: [
          {
            id: rid(),
            question: "Sample question?",
            choices: [
              { id: "a", label: "Option A" },
              { id: "b", label: "Option B" },
            ],
            correctChoiceId: "a",
          },
        ],
      };
    case "video":
      return { url: "", caption: "" };
    case "image_gallery":
      return { images: [{ url: "", caption: "" }] };
    case "micro_lesson":
      return { title: "", steps: [{ title: "Step 1", body: "" }] };
    case "executive_summary":
      return { points: [{ text: "" }] };
    case "on_the_job":
      return { actions: [{ title: "", description: "" }] };
    case "reflection":
      return { prompt: "" };
    case "checklist":
      return { items: [{ id: rid(), label: "" }] };
    default:
      return {};
  }
}
