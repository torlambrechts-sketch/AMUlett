import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { LearningPdLayout } from "@/components/learning/learning-pd-layout";
import { Link } from "@/i18n/navigation";
import { getUserOrgContext } from "@/lib/org/server";
import { getLearningAccess } from "@/lib/learning/server-access";
import { ResourceLibraryForm } from "@/components/learning/resource-library-form";

export default async function ResourceLibraryPage() {
  const t = await getTranslations("lms");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const access = await getLearningAccess(org.organizationId);
  if (!access.canAuthorOrg && !access.isPlatformAdmin) {
    redirect(`/${locale}/learning`);
  }

  return (
    <AppShell title={t("resourceLibraryTitle")} learningLayout="iconRail" mainClassName="!p-0">
      <LearningPdLayout>
      <Link href="/learning/studio" className="mb-6 inline-block text-sm text-[var(--color-primary)] hover:underline">
        ← {t("backToStudio")}
      </Link>
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">{t("resourceLibraryIntro")}</p>
      <ResourceLibraryForm organizationId={org.organizationId} />
      </LearningPdLayout>
    </AppShell>
  );
}
