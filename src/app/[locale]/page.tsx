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
      <p className="mb-6 max-w-3xl text-sm text-[var(--color-text-muted)]">{t("intro")}</p>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] lg:col-span-5">
          <div className="mb-4 flex items-start justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">{t("overviewTitle")}</h2>
          </div>
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-10 text-center">
            <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">—</span>
            </div>
            <p className="max-w-xs text-sm text-[var(--color-text-muted)]">{t("overviewPlaceholder")}</p>
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] lg:col-span-4">
          <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">{t("getStartedTitle")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <QuickTile
              href="/tasks"
              title={t("quickTaskTitle")}
              desc={t("quickTaskDesc")}
              cta={t("openModule")}
            />
            <QuickTile
              href="/settings"
              title={t("quickInviteTitle")}
              desc={t("quickInviteDesc")}
              cta={t("openModule")}
            />
          </div>
        </section>

        <section className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] lg:col-span-3 lg:min-h-[320px]">
          <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">{t("pendingTitle")}</h2>
          <div className="flex flex-1 flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-3 py-8 text-center">
            <svg
              className="mb-3 h-12 w-12 text-[var(--color-text-muted)] opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.25}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664v.75h-4.5M2.25 6v9a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 15V9m-9.75-3.75h9.75" />
            </svg>
            <p className="text-sm text-[var(--color-text-muted)]">{t("pendingEmpty")}</p>
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] lg:col-span-6">
          <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">{t("recentTitle")}</h2>
          <div className="flex min-h-[140px] flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-8 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">{t("recentEmpty")}</p>
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] lg:col-span-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--color-text)]">{tc("title")}</h2>
          </div>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">{tc("subtitle")}</p>
          {complianceRows.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 text-sm text-[var(--color-text-muted)]">
              {locale === "nb"
                ? "Koble til Supabase og kjør migrasjonene for å laste inn lovkoblingen fra databasen."
                : "Connect Supabase and run migrations to load legal mapping from the database."}
            </p>
          ) : (
            <ul className="max-h-56 divide-y divide-[var(--color-border)] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
              {complianceRows.slice(0, 5).map((row) => (
                <li key={row.id} className="px-4 py-2.5">
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {pickLocalized(row.title, locale) ?? row.code}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{row.module}</p>
                </li>
              ))}
            </ul>
          )}
          {complianceRows.length > 5 ? (
            <p className="mt-3 text-right text-sm">
              <a href="#legal-mapping-full" className="font-medium text-[var(--color-primary)] hover:underline">
                {t("seeAll")}
              </a>
            </p>
          ) : null}
        </section>
      </div>

      {complianceRows.length > 5 ? (
        <section id="legal-mapping-full" className="mt-8 scroll-mt-8">
          <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">{tc("title")}</h2>
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
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
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
          {locale === "nb" ? "Moduler" : "Modules"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ModuleCard href="/tasks" title={t("modules.tasks")} desc={t("modules.tasksDesc")} />
          <ModuleCard href="/work-council" title={t("modules.workCouncil")} desc={t("modules.workCouncilDesc")} />
          <ModuleCard href="/hse" title={t("modules.hse")} desc={t("modules.hseDesc")} />
          <ModuleCard href="/documents" title={t("modules.documents")} desc={t("modules.documentsDesc")} />
          <ModuleCard href="/surveys" title={t("modules.surveys")} desc={t("modules.surveysDesc")} />
          <ModuleCard href="/reports" title={t("modules.reports")} desc={t("modules.reportsDesc")} />
          <ModuleCard href="/learning" title={t("modules.learning")} desc={t("modules.learningDesc")} />
          <ModuleCard href="/settings" title={t("modules.settings")} desc={t("modules.settingsDesc")} />
        </div>
      </section>
    </AppShell>
  );
}

function QuickTile({
  href,
  title,
  desc,
  cta,
}: {
  href: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">{desc}</p>
      <Link href={href} className="mt-3 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline">
        {cta}
      </Link>
    </div>
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
      className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition hover:border-[var(--color-primary)] hover:shadow-md"
    >
      <h2 className="text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">{title}</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]">{desc}</p>
    </Link>
  );
}
