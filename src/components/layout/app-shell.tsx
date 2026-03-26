import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[var(--sidebar-w)] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex">
        <div className="flex h-16 items-center border-b border-[var(--color-border)] px-5">
          <Link href="/" className="text-base font-semibold tracking-tight text-[var(--color-text)]">
            AMUlett
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav />
        </div>
        <div className="border-t border-[var(--color-border)] p-4">
          {userEmail ? (
            <p className="mb-3 truncate text-xs text-[var(--color-text-secondary)]" title={userEmail}>
              {userEmail}
            </p>
          ) : null}
          <SignOutButton />
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">{t("sidebarHint")}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 shadow-[var(--shadow-sm)]">
          <MobileNav />
          <div className="min-w-0 flex-1 lg:pl-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--color-text)] lg:text-xl">
              {title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <label className="hidden items-center gap-2 sm:flex">
              <span className="sr-only">Search</span>
              <input
                type="search"
                placeholder={searchPh}
                className="h-9 w-40 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] md:w-56"
                readOnly
                aria-readonly="true"
                title="Connect to search when backend is ready"
              />
            </label>
            <LocaleSwitcher />
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-muted)] text-sm font-semibold text-[var(--color-primary)]"
              title={userEmail ?? "Profile"}
            >
              {(userEmail?.[0] ?? "U").toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
