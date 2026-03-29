import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InviteAcceptClient } from "@/components/auth/invite-accept-client";
import { userHasAnyOrganization } from "@/lib/org/server";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function InvitePage({ searchParams }: Props) {
  const t = await getTranslations("auth");
  const locale = await getLocale();
  const q = await searchParams;
  const token = q.token?.trim();

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-12">
        <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">{t("inviteInvalidTitle")}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("inviteMissingToken")}</p>
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-sm text-[var(--color-text-muted)]">
        {t("supabaseNotConfigured")}
      </div>
    );
  }

  const { data: preview } = await supabase.rpc("get_invitation_preview", { p_token: token });

  if (!preview || typeof preview !== "object") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-12">
        <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">{t("inviteInvalidTitle")}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("inviteExpiredOrInvalid")}</p>
        </div>
      </div>
    );
  }

  const p = preview as {
    organization_slug?: string;
    organization_name?: Record<string, string>;
    expires_at?: string;
  };

  const orgLabel =
    p.organization_name?.[locale] ??
    p.organization_name?.en ??
    p.organization_name?.nb ??
    p.organization_slug ??
    "";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-12">
        <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)]">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">{t("inviteTitle")}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {t("inviteIntro", { organization: orgLabel })}
          </p>
          <Link
            href={{ pathname: "/register", query: { invite: token } }}
            className="mt-6 inline-flex w-full justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)]"
          >
            {t("inviteSignUpToJoin")}
          </Link>
          <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
            <Link
              href={{
                pathname: "/login",
                query: { next: `/invite?token=${encodeURIComponent(token)}` },
              }}
              className="text-[var(--color-primary)] hover:underline"
            >
              {t("inviteAlreadyHaveAccount")}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const hasOrg = await userHasAnyOrganization();
  if (hasOrg) {
    redirect(`/${locale}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-12">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{t("inviteTitle")}</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t("inviteIntro", { organization: orgLabel })}
        </p>
        <InviteAcceptClient token={token} />
      </div>
    </div>
  );
}
