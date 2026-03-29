import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { LearningPdLayout } from "@/components/learning/learning-pd-layout";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { resolveLocalized } from "@/lib/learning/localize";
import { courseShellTitle } from "@/lib/learning/course-display";
import { LearnCourseExperience } from "@/components/learning/learn-course-experience";
import type { LearningModuleRow } from "@/lib/learning/types";

type Props = { params: Promise<{ courseId: string }> };

export default async function CourseLearnPage({ params }: Props) {
  const { courseId } = await params;
  const t = await getTranslations("lms");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  const supabase = await createSupabaseServerClient();
  if (!supabase || !org) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: course } = await supabase
    .from("learning_courses")
    .select("id, slug, title, description, published, scope, organization_id, course_settings")
    .eq("id", courseId)
    .maybeSingle();

  if (!course || !course.published) notFound();

  const allowed =
    course.scope === "system_default" ||
    (course.scope === "organization" && course.organization_id === org.organizationId);

  if (!allowed) notFound();

  const { data: enrollment } = await supabase
    .from("learning_enrollments")
    .select("enrolled_at")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!enrollment?.enrolled_at) {
    redirect(`/${locale}/learning/course/${courseId}`);
  }

  const enrolledAt = new Date(enrollment.enrolled_at);

  let prereqBlocked: { id: string; title: string; slug: string }[] = [];
  if (course.scope === "organization" && course.organization_id) {
    const { data: prereqs } = await supabase
      .from("learning_course_prerequisites")
      .select("prerequisite_course_id")
      .eq("course_id", courseId);

    if (prereqs?.length) {
      for (const p of prereqs) {
        const { data: done } = await supabase
          .from("learning_course_completions")
          .select("completed_at")
          .eq("user_id", user.id)
          .eq("organization_id", org.organizationId)
          .eq("course_id", p.prerequisite_course_id)
          .maybeSingle();

        if (!done) {
          const { data: pc } = await supabase
            .from("learning_courses")
            .select("id, slug, title")
            .eq("id", p.prerequisite_course_id)
            .maybeSingle();
          if (pc) {
            const tr = resolveLocalized(pc.title as Record<string, string>, locale);
            prereqBlocked.push({ id: pc.id, title: tr.text || pc.slug, slug: pc.slug });
          }
        }
      }
    }
  }

  const { data: modRows } = await supabase
    .from("learning_modules")
    .select("id, position, module_type, content, release_rule")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  const modules = (modRows ?? []) as LearningModuleRow[];

  const { data: completion } = await supabase
    .from("learning_course_completions")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("organization_id", org.organizationId)
    .eq("course_id", courseId)
    .maybeSingle();

  const { data: cert } = await supabase
    .from("learning_certificates")
    .select("issued_at, expires_at, pdf_storage_path")
    .eq("user_id", user.id)
    .eq("organization_id", org.organizationId)
    .eq("course_id", courseId)
    .maybeSingle();

  const titleRes = resolveLocalized(course.title as Record<string, string>, locale);
  const shell = courseShellTitle(titleRes, course.slug, {
    notInThisLanguage: t("notAvailableInThisLanguage"),
    shownInLanguage: (lang) => t("contentFromOtherLocale", { language: lang }),
  });

  const settings = (course.course_settings ?? {}) as Record<string, unknown>;
  const gamificationEnabled = Boolean(settings.gamificationEnabled);

  return (
    <AppShell title={shell.title} titleLocaleNote={shell.titleLocaleNote} learningLayout="learning" mainClassName="!p-0">
      <LearningPdLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/learning/course/${courseId}`} className="text-sm text-[var(--color-primary)] hover:underline">
          {t("courseOverview")}
        </Link>
        <Link href="/learning" className="text-sm text-[var(--color-text-muted)] hover:underline">
          {t("backToCatalog")}
        </Link>
      </div>

      <LearnCourseExperience
        courseId={courseId}
        organizationId={org.organizationId}
        modules={modules}
        enrolledAt={enrolledAt.toISOString()}
        prereqBlocked={prereqBlocked}
        alreadyCompleted={!!completion}
        certificate={cert}
        gamificationEnabled={gamificationEnabled}
      />
      </LearningPdLayout>
    </AppShell>
  );
}
