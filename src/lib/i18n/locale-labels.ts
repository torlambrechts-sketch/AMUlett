import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = {
  nb: "Norsk",
  en: "English",
};

export function localeDisplayName(locale: string): string {
  if (LABELS[locale]) return LABELS[locale];
  if (routing.locales.includes(locale as "en" | "nb")) return locale.toUpperCase();
  return locale;
}
