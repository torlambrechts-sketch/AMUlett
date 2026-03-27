import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { pickLocalizedJson } from "@/lib/learning/localize";
import { LearningBlockRenderer } from "@/components/blocks/learning/block-renderer";
import { MarkSectionComplete } from "@/components/learning/mark-section-complete";
import type { LearningBlockType } from "@/lib/learning/types";

type Props = { params: Promise<{ courseId: string }> };

export default async function CourseLearnPage({ params }: Props) {
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

  if (!course || !course.published) notFound();

  const allowed =
    course.scope === "system_default" ||
    (course.scope === "organization" && course.organization_id === org.organizationId);

  if (!allowed) notFound();

  const { data: modules } = await supabase
    .from("learning_modules")
    .select("id, position, module_type, content")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  const title = pickLocalizedJson(course.title as Record<string, string>, locale) || course.slug;

  return (
    <AppShell title={title}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/learning/course/${courseId}`} className="text-sm text-[var(--color-primary)] hover:underline">
          {t("courseOverview")}
        </Link>
        <Link href="/learning" className="text-sm text-[var(--color-text-muted)] hover:underline">
          {t("backToCatalog")}
        </Link>
      </div>

      <div className="space-y-10">
        {(modules ?? []).map((mod, idx) => (
          <article
            key={mod.id}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                {t("section")} {idx + 1}: {(mod.module_type as string).replace(/_/g, " ")}
              </h2>
              <MarkSectionComplete
                organizationId={org.organizationId}
                moduleId={mod.id}
                label={t("markComplete")}
              />
            </div>
            <LearningBlockRenderer
              type={mod.module_type as LearningBlockType}
              content={(mod.content as Record<string, unknown>) ?? {}}
            />
          </article>
        ))}
      </div>
    </AppShell>
  );
}
