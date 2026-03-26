import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function DocumentsPage() {
  const t = await getTranslations("modules");

  return (
    <AppShell title={t("documents")}>
      <p className="max-w-2xl text-[var(--color-text-muted)]">{t("documentsPlaceholder")}</p>
    </AppShell>
  );
}
