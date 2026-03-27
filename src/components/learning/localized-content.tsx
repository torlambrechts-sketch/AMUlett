import { localeDisplayName } from "@/lib/i18n/locale-labels";
import type { ResolvedLocalized } from "@/lib/learning/localize";

type Props = {
  resolved: ResolvedLocalized;
  /** When resolved.text is empty (no locale has content). */
  emptyMessage: string;
  /** When showing text from another locale than the UI. */
  fallbackMessage: (otherLanguage: string) => string;
  className?: string;
  textClassName?: string;
};

export function LocalizedParagraph({
  resolved,
  emptyMessage,
  fallbackMessage,
  className = "",
  textClassName = "text-sm text-[var(--color-text-muted)]",
}: Props) {
  if (!resolved.text) {
    return (
      <p className={`italic text-[var(--color-text-muted)] ${textClassName} ${className}`.trim()}>
        {emptyMessage}
      </p>
    );
  }

  if (!resolved.localeMatched && resolved.usedLocale) {
    const other = localeDisplayName(resolved.usedLocale);
    return (
      <div className={className}>
        <p className="mb-2 text-xs font-medium text-amber-900 dark:text-amber-100/90">{fallbackMessage(other)}</p>
        <p className={textClassName}>{resolved.text}</p>
      </div>
    );
  }

  return <p className={`${textClassName} ${className}`.trim()}>{resolved.text}</p>;
}
