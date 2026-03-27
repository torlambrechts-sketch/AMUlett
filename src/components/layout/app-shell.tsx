import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function initialsFromEmail(email: string | null): string {
  if (!email) return "U";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return local.slice(0, 2).toUpperCase() || "U";
}

function displayNameFromEmail(email: string | null): string {
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

export async function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("nav");
  const searchPh = t("searchPlaceholder");
  const supabase = await createSupabaseServerClient();
  let userEmail: string | null = null;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }

  const initials = initialsFromEmail(userEmail);
  const displayName = displayNameFromEmail(userEmail) || userEmail || "";

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 z-30 hidden h-screen w-[var(--sidebar-w)] shrink-0 flex-col bg-[var(--sidebar-bg)] lg:flex">
        <div className="flex h-[4.25rem] items-center border-b border-[var(--sidebar-border)] px-4">
          <span className="text-lg font-semibold tracking-tight text-white">AMUlett</span>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden pt-3">
          <SidebarNav />
        </div>
        <div className="border-t border-[var(--sidebar-border)] p-4">
          {userEmail ? (
            <p className="mb-3 truncate text-xs text-[var(--sidebar-text-muted)]" title={userEmail}>
              {userEmail}
            </p>
          ) : null}
          <SignOutButton variant="sidebar" />
          <p className="mt-3 text-xs leading-relaxed text-[var(--sidebar-text-muted)]">{t("sidebarHint")}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-[4.25rem] items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 shadow-[var(--shadow-sm)] sm:px-5">
          <MobileNav />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3 lg:gap-4">
            <BrandLogo />
            <div className="min-w-0 sm:flex-1">
              <h1 className="truncate text-sm font-semibold tracking-tight text-[var(--color-text)] sm:text-base lg:text-lg">
                {title}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <label className="hidden items-center gap-2 lg:flex">
              <span className="sr-only">Search</span>
              <input
                type="search"
                placeholder={searchPh}
                className="h-9 w-44 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] xl:w-56"
                readOnly
                aria-readonly="true"
                title="Connect to search when backend is ready"
              />
            </label>
            <button
              type="button"
              className="hidden h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] sm:flex"
              aria-label={t("notifications")}
              title={t("notifications")}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75v-.7V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            </button>
            <LocaleSwitcher />
            <div className="flex items-center gap-2 pl-1">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-muted)] text-xs font-semibold text-[var(--color-primary)]"
                title={userEmail ?? "Profile"}
              >
                {initials}
              </div>
              <div className="hidden min-w-0 max-w-[10rem] md:block">
                <p className="truncate text-sm font-medium text-[var(--color-text)]">{displayName}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 md:px-6 md:py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
