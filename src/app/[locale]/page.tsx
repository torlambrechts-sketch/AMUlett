import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { getComplianceFunctions } from "@/lib/compliance";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("compliance");
  const locale = await getLocale();
  const complianceRows = await getComplianceFunctions();

  return (
    <AppShell title={t("title")}>
      <p className="mb-6 max-w-2xl text-[var(--color-text-muted)]">{t("intro")}</p>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ModuleCard href="/tasks" title={t("modules.tasks")} desc={t("modules.tasksDesc")} />
        <ModuleCard href="/work-council" title={t("modules.workCouncil")} desc={t("modules.workCouncilDesc")} />
        <ModuleCard href="/hse" title={t("modules.hse")} desc={t("modules.hseDesc")} />
        <ModuleCard href="/documents" title={t("modules.documents")} desc={t("modules.documentsDesc")} />
        <ModuleCard href="/surveys" title={t("modules.surveys")} desc={t("modules.surveysDesc")} />
        <ModuleCard href="/reports" title={t("modules.reports")} desc={t("modules.reportsDesc")} />
        <ModuleCard href="/learning" title={t("modules.learning")} desc={t("modules.learningDesc")} />
        <ModuleCard href="/settings" title={t("modules.settings")} desc={t("modules.settingsDesc")} />
      </section>

      <section className="mt-12">
        <h2 className="mb-2 text-xl font-semibold">{tc("title")}</h2>
        <p className="mb-4 max-w-2xl text-sm text-[var(--color-text-muted)]">{tc("subtitle")}</p>
        {complianceRows.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
            {locale === "nb"
              ? "Koble til Supabase og kjør migrasjonene for å laste inn lovkoblingen fra databasen."
              : "Connect Supabase and run migrations to load legal mapping from the database."}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            {complianceRows.map((row) => (
              <li key={row.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    {row.module}
                  </span>
                  <p className="font-medium text-[var(--color-text)]">
                    {pickLocalized(row.title, locale) ?? row.code}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {pickLocalized(row.summary, locale) ?? ""}
                  </p>
                </div>
                <code className="shrink-0 text-xs text-[var(--color-text-muted)]">{row.code}</code>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function pickLocalized(
  value: Record<string, string> | null | undefined,
  locale: string
): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const direct = value[locale];
  if (typeof direct === "string") return direct;
  const en = value.en;
  if (typeof en === "string") return en;
  const nb = value.nb;
  if (typeof nb === "string") return nb;
  const first = Object.values(value).find((v) => typeof v === "string");
  return typeof first === "string" ? first : undefined;
}

function ModuleCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)] transition hover:border-[var(--color-accent)]"
    >
      <h2 className="text-lg font-semibold text-[var(--color-text)] group-hover:text-[var(--color-accent)]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">{desc}</p>
    </Link>
  );
}
