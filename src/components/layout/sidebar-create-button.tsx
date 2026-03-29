"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SidebarCreateButton({
  onNavigate,
  collapsed = false,
  href = "/settings",
  label: labelOverride,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  /** Primary action target (e.g. course studio on learning routes). */
  href?: string;
  /** Override visible label (default: nav.createNew). */
  label?: string;
}) {
  const t = useTranslations("nav");
  const label = labelOverride ?? t("createNew");

  if (collapsed) {
    return (
      <div className="mb-4 flex justify-center px-1">
        <Link
          href={href}
          onClick={onNavigate}
          title={label}
          aria-label={label}
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-md transition hover:bg-[var(--color-primary-hover)]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="mx-3 mb-4 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] shadow-md transition hover:bg-[var(--color-primary-hover)]"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </span>
      {label}
    </Link>
  );
}
