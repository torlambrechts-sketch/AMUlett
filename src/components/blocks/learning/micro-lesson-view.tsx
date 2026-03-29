import type { MicroLessonContent } from "@/lib/learning/types";

export function MicroLessonView({ content }: { content: MicroLessonContent }) {
  const steps = content.steps?.length ? content.steps : [];
  return (
    <div>
      {content.title ? <h3 className="mb-4 text-base font-semibold text-[var(--color-text)]">{content.title}</h3> : null}
      <ol className="space-y-4">
        {steps.map((s, idx) => (
          <li key={idx} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-muted)] text-xs font-bold text-[var(--color-primary)]">
              {idx + 1}
            </span>
            <div>
              <p className="font-medium text-[var(--color-text)]">{s.title}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)] whitespace-pre-wrap">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
