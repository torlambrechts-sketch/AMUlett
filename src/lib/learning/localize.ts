import { routing } from "@/i18n/routing";

/** @deprecated Prefer resolveLocalized for UI; this returns best-effort text only. */
export function pickLocalizedJson(
  value: Record<string, string> | null | undefined,
  locale: string
): string {
  return resolveLocalized(value, locale).text;
}

export type ResolvedLocalized = {
  text: string;
  /** True if `text` came from the requested UI locale (non-empty). */
  localeMatched: boolean;
  /** Locale key actually used for `text`, if any. */
  usedLocale: string | null;
  requestedLocale: string;
};

function localeFallbackOrder(preferred: string): string[] {
  const all = [...routing.locales] as string[];
  return [preferred, ...all.filter((l) => l !== preferred)];
}

/**
 * Prefers the requested UI locale; falls back to other configured locales in order.
 * Sets localeMatched when the primary locale had content.
 */
export function resolveLocalized(
  value: Record<string, string> | null | undefined,
  requestedLocale: string
): ResolvedLocalized {
  if (!value || typeof value !== "object") {
    return { text: "", localeMatched: false, usedLocale: null, requestedLocale };
  }

  const direct = value[requestedLocale];
  if (typeof direct === "string" && direct.trim() !== "") {
    return { text: direct.trim(), localeMatched: true, usedLocale: requestedLocale, requestedLocale };
  }

  for (const loc of localeFallbackOrder(requestedLocale)) {
    if (loc === requestedLocale) continue;
    const v = value[loc];
    if (typeof v === "string" && v.trim() !== "") {
      return { text: v.trim(), localeMatched: false, usedLocale: loc, requestedLocale };
    }
  }

  const any = Object.entries(value).find(([, v]) => typeof v === "string" && v.trim() !== "");
  if (any) {
    return { text: any[1].trim(), localeMatched: false, usedLocale: any[0], requestedLocale };
  }

  return { text: "", localeMatched: false, usedLocale: null, requestedLocale };
}
