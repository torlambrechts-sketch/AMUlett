"use client";

import { useTranslations } from "next-intl";

export function SidebarSearch({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations("nav");
  if (collapsed) return null;

  return (
    <div className="px-3 pb-3">
      <label className="relative block">
        <span className="sr-only">{t("searchPlaceholder")}</span>
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sidebar-text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
        </svg>
        <input
          type="search"
          readOnly
          placeholder={t("searchPlaceholder")}
          className="h-9 w-full rounded-md border border-[var(--sidebar-border)] bg-white py-1.5 pl-9 pr-3 text-xs text-[var(--sidebar-text)] placeholder:text-[var(--sidebar-text-muted)]"
          title={t("searchPlaceholder")}
        />
      </label>
    </div>
  );
}
