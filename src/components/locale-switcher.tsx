"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher({ variant = "header" }: { variant?: "header" | "sidebar" }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const selectCls =
    variant === "sidebar"
      ? "h-9 w-full rounded-md border border-[var(--sidebar-border)] bg-white px-2 text-xs text-[var(--sidebar-text)]"
      : "h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-text)] shadow-sm";

  return (
    <label className="flex w-full items-center gap-2 text-sm text-[var(--color-text-muted)]">
      <span className="sr-only">Language</span>
      <select
        className={selectCls}
        value={locale}
        onChange={(e) => {
          router.replace(pathname, { locale: e.target.value });
        }}
        aria-label="Language"
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc}>
            {loc === "nb" ? "Norsk" : "English"}
          </option>
        ))}
      </select>
    </label>
  );
}
