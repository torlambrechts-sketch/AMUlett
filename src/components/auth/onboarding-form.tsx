"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isValidOrgSlug, slugifyOrganizationName } from "@/lib/slug";

export function OnboardingForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const slugTouched = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!orgName.trim()) {
      setError(t("orgNameRequired"));
      return;
    }
    const slug =
      orgSlug.trim() ||
      slugifyOrganizationName(orgName) ||
      `org-${crypto.randomUUID().slice(0, 8)}`;
    if (!isValidOrgSlug(slug)) {
      setError(t("invalidSlug"));
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const nameJson = { [locale]: orgName.trim() };
      const { error: bootError } = await supabase.rpc("bootstrap_user_organization", {
        p_slug: slug,
        p_name: nameJson,
      });
      if (bootError) {
        setError(bootError.message);
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError(t("unexpectedError"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="onb-org" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          {t("organizationName")}
        </label>
        <input
          id="onb-org"
          type="text"
          autoComplete="organization"
          required
          value={orgName}
          onChange={(e) => {
            const v = e.target.value;
            setOrgName(v);
            if (!slugTouched.current) {
              setOrgSlug(slugifyOrganizationName(v));
            }
          }}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>
      <div>
        <label htmlFor="onb-slug" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          {t("organizationSlug")}
        </label>
        <input
          id="onb-slug"
          type="text"
          autoComplete="off"
          value={orgSlug}
          onChange={(e) => {
            slugTouched.current = true;
            setOrgSlug(slugifyOrganizationName(e.target.value));
          }}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("slugHint")}</p>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {loading ? t("saving") : t("createOrganization")}
      </button>
    </form>
  );
}
