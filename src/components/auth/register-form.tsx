"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { slugifyOrganizationName, isValidOrgSlug } from "@/lib/slug";

export function RegisterForm({
  inviteToken,
  nextPath,
}: {
  inviteToken?: string;
  nextPath?: string;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const slugTouched = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isInvite = Boolean(inviteToken);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isInvite) {
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
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const defaultNext = isInvite
        ? `/${locale}/invite?token=${encodeURIComponent(inviteToken!)}`
        : `/${locale}/onboarding`;
      const next =
        nextPath && nextPath.startsWith("/") ? nextPath : defaultNext;
      const emailRedirectTo = `${origin}/${locale}/auth/callback?next=${encodeURIComponent(next)}`;

      const { data, error: signError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo },
      });

      if (signError) {
        setError(signError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        if (isInvite) {
          router.push(`/invite?token=${encodeURIComponent(inviteToken!)}`);
        } else {
          const slug =
            orgSlug.trim() ||
            slugifyOrganizationName(orgName) ||
            `org-${crypto.randomUUID().slice(0, 8)}`;
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
        }
        router.refresh();
        return;
      }

      setError(t("confirmEmail"));
      setLoading(false);
    } catch {
      setError(t("unexpectedError"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {!isInvite ? (
        <>
          <div>
            <label htmlFor="reg-org" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              {t("organizationName")}
            </label>
            <input
              id="reg-org"
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
            <label htmlFor="reg-slug" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              {t("organizationSlug")}
            </label>
            <input
              id="reg-slug"
              type="text"
              autoComplete="off"
              value={orgSlug}
              onChange={(e) => {
                slugTouched.current = true;
                setOrgSlug(slugifyOrganizationName(e.target.value));
              }}
              placeholder="acme-corp"
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("slugHint")}</p>
          </div>
        </>
      ) : (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-primary-muted)] px-3 py-2 text-sm text-[var(--color-text)]">
          {t("inviteRegisterHint")}
        </p>
      )}
      <div>
        <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          {t("email")}
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>
      <div>
        <label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          {t("password")}
        </label>
        <input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("passwordHint")}</p>
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
        {loading ? t("creatingAccount") : t("createAccount")}
      </button>
    </form>
  );
}
