import { routing } from "@/i18n/routing";

const LOCALES = new Set(routing.locales);

/** Path after locale prefix, e.g. "/tasks", "/auth/callback", "/". */
export function pathAfterLocale(pathname: string): { locale: string; suffix: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return { locale: routing.defaultLocale, suffix: "/" };
  }
  const maybeLocale = parts[0];
  if (!LOCALES.has(maybeLocale as "en" | "nb")) {
    return null;
  }
  const locale = maybeLocale;
  if (parts.length === 1) {
    return { locale, suffix: "/" };
  }
  return { locale, suffix: "/" + parts.slice(1).join("/") };
}

export function isAuthPublicPath(suffix: string): boolean {
  if (suffix === "/login" || suffix === "/register" || suffix === "/onboarding") {
    return true;
  }
  if (suffix.startsWith("/invite")) {
    return true;
  }
  if (suffix.startsWith("/auth/callback")) {
    return true;
  }
  return false;
}

export function isOnboardingOnlyPath(suffix: string): boolean {
  return suffix === "/onboarding" || suffix.startsWith("/onboarding/");
}
