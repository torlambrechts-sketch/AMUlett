import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { userCanAmuWrite } from "@/lib/amu/server-access";
import { AmuChairRotationAlert } from "@/components/amu/amu-chair-rotation-alert";
import { AmuSubnav } from "@/components/amu/amu-subnav";

export default async function WorkCouncilDashboardPage() {
  const t = await getTranslations("amu");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/${locale}/login`);

  const canWrite = await userCanAmuWrite(org.organizationId);

  const year = new Date().getFullYear();

  let meetingsCount = 0;
  let openResolutions = 0;
  let electionsOpen = 0;
  type AmuSettingsRow = { chair_side: string; last_chair_rotation_year: number | null };
  let settings: AmuSettingsRow | null = null;

  const mcRes = await supabase
    .from("work_council_meetings")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.organizationId)
    .eq("status", "completed");
  meetingsCount = mcRes.error ? 0 : (mcRes.count ?? 0);

  const rcRes = await supabase
    .from("amu_resolutions")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.organizationId)
    .neq("status", "completed");
  openResolutions = rcRes.error ? 0 : (rcRes.count ?? 0);

  const ecRes = await supabase
    .from("amu_elections")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.organizationId)
    .in("phase", ["nomination", "voting"]);
  electionsOpen = ecRes.error ? 0 : (ecRes.count ?? 0);

  const setRes = await supabase.from("amu_org_settings").select("chair_side, last_chair_rotation_year").eq("organization_id", org.organizationId).maybeSingle();
  settings = setRes.error ? null : (setRes.data as AmuSettingsRow | null);

  return (
    <AppShell title={t("pageTitle")}>
      <AmuSubnav />
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("intro")}</p>

      <AmuChairRotationAlert
        year={year}
        lastRotationYear={settings?.last_chair_rotation_year ?? null}
        canWrite={canWrite}
        organizationId={org.organizationId}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">{t("statMeetingsCompleted")}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{meetingsCount}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">{t("statOpenResolutions")}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{openResolutions}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">{t("statActiveElections")}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{electionsOpen}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">{t("statChairSide")}</p>
          <p className="mt-1 text-sm font-semibold capitalize text-[var(--color-text)]">
            {settings?.chair_side ? t(`chairSide.${settings.chair_side}`) : t("chairSide.employer")}
          </p>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">{t("quickLinks")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/work-council/roster" className="text-[var(--color-primary)] hover:underline">
              {t("navRoster")}
            </Link>
            {" — "}
            <span className="text-[var(--color-text-muted)]">{t("quickRosterDesc")}</span>
          </li>
          <li>
            <Link href="/work-council/elections" className="text-[var(--color-primary)] hover:underline">
              {t("navElections")}
            </Link>
            {" — "}
            <span className="text-[var(--color-text-muted)]">{t("quickElectionsDesc")}</span>
          </li>
          <li>
            <Link href="/work-council/meetings" className="text-[var(--color-primary)] hover:underline">
              {t("navMeetings")}
            </Link>
            {" — "}
            <span className="text-[var(--color-text-muted)]">{t("quickMeetingsDesc")}</span>
          </li>
          <li>
            <Link href="/work-council/resolutions" className="text-[var(--color-primary)] hover:underline">
              {t("navResolutions")}
            </Link>
            {" — "}
            <span className="text-[var(--color-text-muted)]">{t("quickResolutionsDesc")}</span>
          </li>
          <li>
            <Link href="/hse" className="text-[var(--color-primary)] hover:underline">
              {t("linkHse")}
            </Link>
            {" — "}
            <span className="text-[var(--color-text-muted)]">{t("quickHseDesc")}</span>
          </li>
        </ul>
      </div>

      <p className="mt-6 text-xs text-[var(--color-text-muted)]">{t("migrationHint")}</p>
    </AppShell>
  );
}
