"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function AmuSubnav() {
  const t = useTranslations("amu");
  const pathname = usePathname();

  const links: { href: string; label: string }[] = [
    { href: "/work-council", label: t("navOverview") },
    { href: "/work-council/roster", label: t("navRoster") },
    { href: "/work-council/elections", label: t("navElections") },
    { href: "/work-council/meetings", label: t("navMeetings") },
    { href: "/work-council/resolutions", label: t("navResolutions") },
    { href: "/work-council/reports", label: t("navReports") },
  ];

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
      {links.map(({ href, label }) => {
        const active = pathname === href || (href !== "/work-council" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={[
              "rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium",
              active ? "bg-[var(--color-primary-muted)] text-[var(--color-primary)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
