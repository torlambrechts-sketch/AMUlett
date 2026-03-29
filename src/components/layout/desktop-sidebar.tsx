"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SidebarSearch } from "@/components/layout/sidebar-search";
import { SignOutButton } from "@/components/auth/sign-out-button";

const STORAGE_KEY = "amu-sidebar-collapsed";
const LEARNING_STORAGE_KEY = "amu-learning-sidebar-collapsed";
const CHANGE_EVENT = "amu-sidebar-collapsed";

function readStoredCollapsed(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function persistCollapsed(key: string, next: boolean) {
  try {
    window.localStorage.setItem(key, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function DesktopSidebar({
  userEmail,
  variant = "default",
}: {
  userEmail: string | null;
  /** E-learning: light sidebar, full width when expanded (PandaDoc-style), separate collapse memory (defaults expanded). */
  variant?: "default" | "learning";
}) {
  const t = useTranslations("nav");
  const tLms = useTranslations("lms");
  const storageKey = variant === "learning" ? LEARNING_STORAGE_KEY : STORAGE_KEY;

  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    () => readStoredCollapsed(storageKey),
    () => false,
  );

  const widthClass = collapsed ? "w-[var(--sidebar-w-collapsed)]" : "w-[var(--sidebar-w)]";

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      data-variant={variant}
      className={[
        "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-[width] duration-200 ease-out lg:flex",
        widthClass,
      ].join(" ")}
    >
      <div
        className={[
          "flex h-[4.25rem] shrink-0 items-center border-b border-[var(--sidebar-border)]",
          collapsed ? "justify-center px-2" : "gap-2 px-3",
        ].join(" ")}
      >
        {collapsed ? (
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--sidebar-text)] transition hover:bg-[var(--sidebar-hover)]"
            aria-label={t("home")}
            title={t("appName")}
          >
            <span
              className={
                variant === "learning"
                  ? "flex h-9 w-9 items-center justify-center rounded-md border border-[var(--sidebar-border)] bg-white text-[var(--sidebar-text)] shadow-sm"
                  : "flex h-9 w-9 items-center justify-center rounded-md bg-white/15 text-[var(--sidebar-text)]"
              }
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3L4 9v12h16V9l-8-6z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </span>
          </Link>
        ) : (
          <div className="min-w-0 flex-1 [&_a]:max-w-full [&_span:last-child]:truncate">
            <BrandLogo variant="prominent" />
          </div>
        )}
        {!collapsed ? (
          <button
            type="button"
            onClick={() => persistCollapsed(storageKey, true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--sidebar-text-muted)] transition hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]"
            title={t("collapseMenu")}
            aria-expanded={!collapsed}
            aria-label={t("collapseMenu")}
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <div className="flex justify-center border-b border-[var(--sidebar-border)] py-2">
          <button
            type="button"
            onClick={() => persistCollapsed(storageKey, false)}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--sidebar-text-muted)] transition hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]"
            title={t("expandMenu")}
            aria-expanded={collapsed}
            aria-label={t("expandMenu")}
          >
            <IconChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      {variant === "learning" ? <SidebarSearch collapsed={collapsed} /> : null}

      <div className="flex flex-1 flex-col overflow-hidden pt-1">
        <SidebarNav
          collapsed={collapsed}
          createHref={variant === "learning" ? "/learning/studio/new" : undefined}
          createLabel={variant === "learning" ? tLms("pdNewCourse") : undefined}
        />
      </div>

      <div
        className={[
          "border-t border-[var(--sidebar-border)]",
          collapsed ? "flex flex-col items-center gap-2 p-2" : "p-4",
        ].join(" ")}
      >
        {userEmail && !collapsed ? (
          <p className="mb-3 truncate text-xs text-[var(--sidebar-text-muted)]" title={userEmail}>
            {userEmail}
          </p>
        ) : null}
        <SignOutButton variant={variant === "learning" ? "sidebar" : "sidebarLight"} collapsed={collapsed} />
        {!collapsed ? (
          <p className="mt-3 text-xs leading-relaxed text-[var(--sidebar-text-muted)]">{t("sidebarHint")}</p>
        ) : null}
      </div>
    </aside>
  );
}

function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}
