"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function HseSubnav() {
  const t = useTranslations("hse");
  const pathname = usePathname();

  const links: { href: string; labelKey: "navOverview" | "navRos" | "navDeviations" | "navInspections" | "navHalt" | "navWhistleblower" }[] = [
    { href: "/hse", labelKey: "navOverview" },
    { href: "/hse/ros", labelKey: "navRos" },
    { href: "/hse/deviations", labelKey: "navDeviations" },
    { href: "/hse/inspections", labelKey: "navInspections" },
    { href: "/hse/halt", labelKey: "navHalt" },
    { href: "/hse/whistleblower", labelKey: "navWhistleblower" },
  ];

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
      {links.map(({ href, labelKey }) => {
        const active = pathname === href || (href !== "/hse" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={[
              "rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium",
              active ? "bg-[var(--color-primary-muted)] text-[var(--color-primary)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]",
            ].join(" ")}
          >
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
