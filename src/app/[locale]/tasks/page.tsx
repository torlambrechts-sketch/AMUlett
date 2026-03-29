import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function TasksPage() {
  const t = await getTranslations("modules");

  return (
    <AppShell title={t("tasks")}>
      <p className="max-w-2xl text-[var(--color-text-muted)]">{t("tasksPlaceholder")}</p>
    </AppShell>
  );
}
