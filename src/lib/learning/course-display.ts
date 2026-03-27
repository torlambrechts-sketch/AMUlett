import { localeDisplayName } from "@/lib/i18n/locale-labels";
import type { ResolvedLocalized } from "@/lib/learning/localize";

export function courseShellTitle(
  resolved: ResolvedLocalized,
  slug: string,
  messages: {
    notInThisLanguage: string;
    shownInLanguage: (lang: string) => string;
  }
): { title: string; titleLocaleNote: string | null } {
  if (!resolved.text) {
    return { title: slug, titleLocaleNote: messages.notInThisLanguage };
  }
  if (!resolved.localeMatched && resolved.usedLocale) {
    return {
      title: resolved.text,
      titleLocaleNote: messages.shownInLanguage(localeDisplayName(resolved.usedLocale)),
    };
  }
  return { title: resolved.text, titleLocaleNote: null };
}
