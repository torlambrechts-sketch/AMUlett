import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function HsePage() {
  const t = await getTranslations("modules");

  return (
    <AppShell title={t("hse")}>
      <p className="max-w-2xl text-[var(--color-text-muted)]">{t("hsePlaceholder")}</p>
    </AppShell>
  );
}
