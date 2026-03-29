import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { InvitesSection } from "@/components/settings/invites-section";
import { HseHaltSettings } from "@/components/settings/hse-halt-settings";
import { normalizeInvitationRole } from "@/lib/org/invitation-role";

function pickLocalized(
  value: Record<string, string> | null | undefined,
  locale: string
): string {
  if (!value || typeof value !== "object") return "";
  return (
    value[locale] ??
    value.en ??
    value.nb ??
    Object.values(value).find((v) => typeof v === "string") ??
    ""
  );
}

export default async function SettingsPage() {
  const t = await getTranslations("modules");
  const ta = await getTranslations("settingsInvites");
  const locale = await getLocale();
  const org = await getUserOrgContext();

  if (!org) {
    redirect(`/${locale}/onboarding`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <AppShell title={t("settings")}>
        <p className="text-[var(--color-text-muted)]">{ta("supabaseRequired")}</p>
      </AppShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: memberRow } = await supabase
    .from("organization_members")
    .select("roles(code)")
    .eq("organization_id", org.organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  const roleEmbed = memberRow?.roles as { code: string } | null | undefined;
  const isOrgAdmin = roleEmbed?.code === "org_admin";

  const { data: roles } = await supabase.from("roles").select("id, code, label").order("code");

  const { data: hseOrg } = await supabase
    .from("hse_org_settings")
    .select("halt_alert_emails")
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  const haltEmails = (hseOrg?.halt_alert_emails as string[] | null) ?? [];

  const { data: pending } = await supabase
    .from("organization_invitations")
    .select("id, email, expires_at, roles ( code, label )")
    .eq("organization_id", org.organizationId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  const roleOptions =
    roles?.map((r) => ({
      id: r.id,
      code: r.code,
      label: pickLocalized(r.label as Record<string, string>, locale),
    })) ?? [];

  const pendingRows =
    pending?.map((row) => {
      const roleEmbed = normalizeInvitationRole(row.roles);
      return {
        id: row.id,
        email: row.email,
        expires_at: row.expires_at,
        roleLabel: roleEmbed ? pickLocalized(roleEmbed.label, locale) : "",
        roleCode: roleEmbed?.code ?? "",
      };
    }) ?? [];

  return (
    <AppShell title={t("settings")}>
      <p className="mb-8 max-w-2xl text-[var(--color-text-muted)]">{t("settingsPlaceholder")}</p>

      <section className="mb-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{ta("organizationTitle")}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--color-text-muted)]">{ta("orgName")}</dt>
            <dd className="font-medium text-[var(--color-text)]">
              {pickLocalized(org.name, locale) || org.slug}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-muted)]">{ta("orgSlug")}</dt>
            <dd className="font-mono text-[var(--color-text)]">{org.slug}</dd>
          </div>
        </dl>
      </section>

      {isOrgAdmin ? (
        <section className="mb-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <HseHaltSettings organizationId={org.organizationId} initialEmails={haltEmails} />
        </section>
      ) : null}

      {isOrgAdmin ? (
        <InvitesSection
        organizationId={org.organizationId}
        roleOptions={roleOptions}
        initialPending={pendingRows}
        labels={{
          title: ta("invitesTitle"),
          subtitle: ta("invitesSubtitle"),
          email: ta("email"),
          role: ta("role"),
          sendInvite: ta("sendInvite"),
          sending: ta("sending"),
          pendingTitle: ta("pendingTitle"),
          expires: ta("expires"),
          revoke: ta("revoke"),
          copyLink: ta("copyLink"),
          linkCopied: ta("linkCopied"),
          inviteCreated: ta("inviteCreated"),
          noPending: ta("noPending"),
        }}
        />
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">{ta("invitesAdminOnly")}</p>
      )}
    </AppShell>
  );
}
