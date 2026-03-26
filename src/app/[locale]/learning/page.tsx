import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function LearningPage() {
  const t = await getTranslations("modules");

  return (
    <AppShell title={t("learning")}>
      <p className="max-w-2xl text-[var(--color-text-muted)]">{t("learningPlaceholder")}</p>
    </AppShell>
  );
}
