import type { ShortMessageContent } from "@/lib/learning/types";

export function ShortMessageView({ content }: { content: ShortMessageContent }) {
  return (
    <div className="rounded-[var(--radius-lg)] border-l-4 border-[var(--color-primary)] bg-[var(--color-primary-muted)] px-4 py-3">
      <p className="text-sm font-medium text-[var(--color-text)]">{content.message ?? ""}</p>
    </div>
  );
}
