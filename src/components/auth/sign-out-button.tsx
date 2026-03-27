"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({ variant = "default" }: { variant?: "default" | "sidebar" }) {
  const t = useTranslations("auth");
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const cls =
    variant === "sidebar"
      ? "w-full rounded-[var(--radius-md)] border border-[var(--sidebar-border)] px-3 py-2 text-xs font-medium text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]"
      : "rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]";

  return (
    <button type="button" onClick={signOut} className={cls}>
      {t("signOut")}
    </button>
  );
}
