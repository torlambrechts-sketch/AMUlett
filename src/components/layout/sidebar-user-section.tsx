"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";

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

export function SidebarUserSection({
  userEmail,
  collapsed,
}: {
  userEmail: string | null;
  collapsed: boolean;
}) {
  const t = useTranslations("nav");
  const initials = initialsFromEmail(userEmail);
  const displayName = displayNameFromEmail(userEmail) || userEmail || "";

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-[var(--sidebar-border)] py-2">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(45,142,82,0.14)] text-xs font-semibold text-[#2d8e52]"
          title={userEmail ?? t("profile")}
        >
          {initials}
        </div>
        <SignOutButton variant="sidebar" collapsed />
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-[var(--sidebar-border)] px-3 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(45,142,82,0.14)] text-xs font-semibold text-[#2d8e52]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--sidebar-text)]">{displayName}</p>
          {userEmail ? (
            <p className="truncate text-xs text-[var(--sidebar-text-muted)]" title={userEmail}>
              {userEmail}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <LocaleSwitcher variant="sidebar" />
        <SignOutButton variant="sidebar" collapsed={false} />
      </div>
      <p className="text-xs leading-relaxed text-[var(--sidebar-text-muted)]">{t("sidebarHint")}</p>
    </div>
  );
}
