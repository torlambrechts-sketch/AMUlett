"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
      <span className="sr-only">Language</span>
      <select
        className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 text-sm text-[var(--color-text)]"
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
