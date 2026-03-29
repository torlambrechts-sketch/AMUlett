import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { fetchPublishedCatalog } from "@/lib/learning/catalog";
import { getUserOrgContext } from "@/lib/org/server";
import { getLearningAccess } from "@/lib/learning/server-access";
import { LearningAcCatalog } from "@/components/learning/learning-ac-catalog";
import { LearningSubnavWrapper } from "@/components/learning/learning-subnav-wrapper";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function firstNameFromEmail(email: string | null): string {
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const raw = parts[0] ?? local;
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export default async function LearningPage() {
  const t = await getTranslations("lms");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  const access = await getLearningAccess(org?.organizationId ?? null);
  const catalog = org ? await fetchPublishedCatalog(org.organizationId) : { system: [], organization: [] };

  const supabase = await createSupabaseServerClient();
  let userEmail: string | null = null;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }
  const firstName = firstNameFromEmail(userEmail);

  const rows = [...catalog.system, ...catalog.organization];
  const featured = catalog.system[0] ?? catalog.organization[0] ?? null;

  const canAuthor = access.canAuthorOrg || access.isPlatformAdmin;

  return (
    <AppShell
      title={t("catalogTitle")}
      learningLayout="iconRail"
      mainClassName="learning-pd-workspace !p-0"
    >
      {!org ? (
        <div className="p-6 text-[#6b7280] md:p-8">
          <p className="text-sm">{t("needOrg")}</p>
        </div>
      ) : (
        <LearningSubnavWrapper canAuthor={canAuthor}>
          <LearningAcCatalog
            locale={locale}
            learnerName={firstName || t("acGuestName")}
            featured={featured}
            rows={rows}
            canAuthor={canAuthor}
          />
        </LearningSubnavWrapper>
      )}
    </AppShell>
  );
}
