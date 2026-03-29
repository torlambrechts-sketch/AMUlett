import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { userHasAnyOrganization } from "@/lib/org/server";

export default async function OnboardingPage() {
  const t = await getTranslations("auth");
  const locale = await getLocale();
  const hasOrg = await userHasAnyOrganization();
  if (hasOrg) {
    redirect(`/${locale}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-12">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{t("onboardingTitle")}</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("onboardingSubtitle")}</p>
        <div className="mt-6">
          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}
