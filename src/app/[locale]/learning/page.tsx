import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { fetchPublishedCatalog } from "@/lib/learning/catalog";
import { getUserOrgContext } from "@/lib/org/server";
import { getLearningAccess } from "@/lib/learning/server-access";
import { LearningAcCatalog } from "@/components/learning/learning-ac-catalog";
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

  return (
    <AppShell title={t("catalogTitle")} hideHeaderTitle mainClassName="learning-ac-main !bg-[#f4f7ff] !px-0 !py-0 md:!px-0 md:!py-0 lg:!px-0 lg:!py-0">
      {!org ? (
        <div className="learning-ac-main px-6 py-10 text-[#171a1f]">
          <p className="text-sm text-[#9095a1]">{t("needOrg")}</p>
        </div>
      ) : (
        <LearningAcCatalog
          locale={locale}
          learnerName={firstName || t("acGuestName")}
          featured={featured}
          rows={rows}
          canAuthor={access.canAuthorOrg || access.isPlatformAdmin}
        />
      )}
    </AppShell>
  );
}
