import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/layout/brand-logo";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function AppShell({
  title,
  titleLocaleNote,
  mainClassName,
  hideHeaderTitle,
  children,
}: {
  title: string;
  titleLocaleNote?: string | null;
  mainClassName?: string;
  hideHeaderTitle?: boolean;
  children: React.ReactNode;
}) {
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
      <DesktopSidebar userEmail={userEmail} />

      <div className="flex min-w-0 flex-1 flex-col bg-[var(--workspace-bg)]">
        <header className="sticky top-0 z-40 flex min-h-[3.5rem] items-center gap-2 border-b border-[#e8eaed] bg-white px-3 py-2.5 sm:gap-3 sm:px-5 lg:min-h-[3.25rem]">
          <MobileNav userEmail={userEmail} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3 lg:gap-4">
            <div className="shrink-0 lg:hidden">
              <BrandLogo />
            </div>
            <div className="min-w-0 sm:flex-1">
              {hideHeaderTitle ? (
                <h1 className="sr-only">{title}</h1>
              ) : (
                <>
                  <h1 className="truncate text-base font-semibold text-[#1a1d21] sm:text-lg">{title}</h1>
                  {titleLocaleNote ? <p className="mt-0.5 truncate text-xs text-amber-800">{titleLocaleNote}</p> : null}
                </>
              )}
            </div>
          </div>
        </header>

        <main
          className={["flex-1 bg-[var(--workspace-bg)] p-4 md:p-6 lg:p-8", mainClassName ?? ""].join(" ")}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
