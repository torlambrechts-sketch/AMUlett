"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({
  variant = "default",
  collapsed = false,
}: {
  variant?: "default" | "sidebar" | "sidebarLight";
  collapsed?: boolean;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const signOutLabel = t("signOut");

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if ((variant === "sidebarLight" || variant === "sidebar") && collapsed) {
    return (
      <button
        type="button"
        onClick={signOut}
        title={signOutLabel}
        aria-label={signOutLabel}
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--sidebar-border)] text-[var(--sidebar-text-muted)] transition hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]"
      >
        <IconSignOut className="h-4 w-4" />
      </button>
    );
  }

  const cls =
    variant === "sidebar" || variant === "sidebarLight"
      ? "w-full rounded-[var(--radius-md)] border border-[var(--sidebar-border)] bg-white px-3 py-2 text-xs font-medium text-[var(--sidebar-text-secondary)] hover:bg-[var(--sidebar-hover)]"
      : "rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]";

  return (
    <button type="button" onClick={signOut} className={cls}>
      {signOutLabel}
    </button>
  );
}

function IconSignOut({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M18 12H9.75m0 0 3 3m-3-3 3-3" />
    </svg>
  );
}
