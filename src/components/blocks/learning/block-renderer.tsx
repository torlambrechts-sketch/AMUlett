import type { LearningBlockType } from "@/lib/learning/types";
import { RichTextView } from "@/components/blocks/learning/rich-text-view";
import { FlashCardsView } from "@/components/blocks/learning/flash-cards-view";
import { ShortMessageView } from "@/components/blocks/learning/short-message-view";
import { QuizView } from "@/components/blocks/learning/quiz-view";
import { VideoView } from "@/components/blocks/learning/video-view";
import { ImageGalleryView } from "@/components/blocks/learning/image-gallery-view";
import { MicroLessonView } from "@/components/blocks/learning/micro-lesson-view";
import { ExecutiveSummaryView } from "@/components/blocks/learning/executive-summary-view";
import { OnTheJobView } from "@/components/blocks/learning/on-the-job-view";
import { ReflectionView } from "@/components/blocks/learning/reflection-view";
import { ChecklistView } from "@/components/blocks/learning/checklist-view";
import { PdfView } from "@/components/blocks/learning/pdf-view";
import { ScormXapiView } from "@/components/blocks/learning/scorm-xapi-view";
import { H5pView } from "@/components/blocks/learning/h5p-view";
import { AssignmentBlockView } from "@/components/blocks/learning/assignment-block-view";
import { ForumBlockView } from "@/components/blocks/learning/forum-block-view";

export function LearningBlockRenderer({
  type,
  content,
  courseId,
  onQuizComplete,
}: {
  type: LearningBlockType;
  content: Record<string, unknown>;
  courseId?: string;
  onQuizComplete?: (scorePercent: number) => void;
}) {
  switch (type) {
    case "rich_text":
      return <RichTextView content={content as never} />;
    case "flash_cards":
      return <FlashCardsView content={content as never} />;
    case "short_message":
      return <ShortMessageView content={content as never} />;
    case "quiz":
      return <QuizView content={content as never} onComplete={onQuizComplete} />;
    case "video":
      return <VideoView content={content as never} />;
    case "image_gallery":
      return <ImageGalleryView content={content as never} />;
    case "micro_lesson":
      return <MicroLessonView content={content as never} />;
    case "executive_summary":
      return <ExecutiveSummaryView content={content as never} />;
    case "on_the_job":
      return <OnTheJobView content={content as never} />;
    case "reflection":
      return <ReflectionView content={content as never} />;
    case "checklist":
      return <ChecklistView content={content as never} />;
    case "pdf":
      return <PdfView content={content as never} />;
    case "scorm_xapi":
      return <ScormXapiView content={content as never} />;
    case "h5p":
      return <H5pView content={content as never} />;
    case "assignment":
      return <AssignmentBlockView content={content as never} />;
    case "forum":
      return courseId ? <ForumBlockView courseId={courseId} content={content as never} /> : <p className="text-sm text-[var(--color-text-muted)]">Forum</p>;
    default:
      return <p className="text-sm text-[var(--color-text-muted)]">Unsupported block.</p>;
  }
}
