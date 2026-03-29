import { Link } from "@/i18n/navigation";

export function ForumBlockView({
  courseId,
  content,
}: {
  courseId: string;
  content: { headline?: string };
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <p className="text-sm font-medium text-[var(--color-text)]">{content.headline ?? "Discussion"}</p>
      <Link href={`/learning/course/${courseId}/forum`} className="mt-2 inline-block text-sm text-[var(--color-primary)] hover:underline">
        Open course forum
      </Link>
    </div>
  );
}
