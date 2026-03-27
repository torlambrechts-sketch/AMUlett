import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { pickLocalizedJson } from "@/lib/learning/localize";
import { EnrollButton } from "@/components/learning/enroll-button";

type Props = { params: Promise<{ courseId: string }> };

export default async function CourseDetailPage({ params }: Props) {
  const { courseId } = await params;
  const t = await getTranslations("lms");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  const supabase = await createSupabaseServerClient();
  if (!supabase || !org) notFound();

  const { data: course } = await supabase
    .from("learning_courses")
    .select("id, slug, title, description, published, scope, organization_id")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) notFound();

  const canSee =
    (course.scope === "system_default" && course.published) ||
    (course.scope === "organization" &&
      course.organization_id === org.organizationId &&
      course.published);

  if (!canSee) notFound();

  const { data: modules } = await supabase
    .from("learning_modules")
    .select("id, position, module_type")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  return (
    <AppShell title={pickLocalizedJson(course.title as Record<string, string>, locale) || course.slug}>
      <p className="mb-6 max-w-2xl text-sm text-[var(--color-text-muted)]">
        {pickLocalizedJson(course.description as Record<string, string>, locale)}
      </p>
      <div className="mb-8 flex flex-wrap gap-3">
        <EnrollButton courseId={course.id} label={t("enroll")} />
        <Link
          href={`/learning/course/${course.id}/learn`}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
        >
          {t("continueLearning")}
        </Link>
        <Link href="/learning" className="rounded-[var(--radius-md)] px-4 py-2 text-sm text-[var(--color-primary)] hover:underline">
          {t("backToCatalog")}
        </Link>
      </div>
      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--color-text)]">{t("outline")}</h2>
        <ol className="space-y-2">
          {(modules ?? []).map((m, idx) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-muted)] text-xs font-bold text-[var(--color-primary)]">
                {idx + 1}
              </span>
              <span className="text-[var(--color-text)]">{m.module_type.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ol>
      </section>
    </AppShell>
  );
}
