import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { getLearningAccess } from "@/lib/learning/server-access";
import { resolveLocalized } from "@/lib/learning/localize";
import { courseShellTitle } from "@/lib/learning/course-display";
import { CourseEditor } from "@/components/learning/course-editor";
import type { LearningModuleRow } from "@/lib/learning/types";

type Props = { params: Promise<{ courseId: string }> };

export default async function StudioCoursePage({ params }: Props) {
  const { courseId } = await params;
  const t = await getTranslations("lms");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  if (!org) redirect(`/${locale}/onboarding`);

  const access = await getLearningAccess(org.organizationId);
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: course } = await supabase
    .from("learning_courses")
    .select("id, slug, title, description, published, scope, organization_id, course_settings")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) notFound();

  const canEditOrg =
    course.scope === "organization" &&
    course.organization_id === org.organizationId &&
    access.canAuthorOrg;

  const canEditSystem = course.scope === "system_default" && access.isPlatformAdmin;

  const canViewSystemForExport =
    course.scope === "system_default" &&
    course.published &&
    access.canAuthorOrg &&
    !access.isPlatformAdmin;

  if (!canEditOrg && !canEditSystem && !canViewSystemForExport) {
    redirect(`/${locale}/learning`);
  }

  const readOnly = canViewSystemForExport;

  const { data: modRows } = await supabase
    .from("learning_modules")
    .select("id, course_id, position, module_type, content, release_rule")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  let siblingCourses: { id: string; slug: string; title: Record<string, string> | null }[] = [];
  if (course.scope === "organization" && course.organization_id && canEditOrg) {
    const { data: sibs } = await supabase
      .from("learning_courses")
      .select("id, slug, title")
      .eq("scope", "organization")
      .eq("organization_id", course.organization_id);
    siblingCourses = (sibs ?? []) as typeof siblingCourses;
  }

  const titleRes = resolveLocalized(course.title as Record<string, string>, locale);
  const shell = courseShellTitle(titleRes, course.slug, {
    notInThisLanguage: t("notAvailableInThisLanguage"),
    shownInLanguage: (lang) => t("contentFromOtherLocale", { language: lang }),
  });

  return (
    <AppShell title={`${t("studioTitle")}: ${shell.title}`} titleLocaleNote={shell.titleLocaleNote}>
      <CourseEditor
        readOnly={readOnly}
        organizationId={course.organization_id}
        siblingCourses={siblingCourses}
        locale={locale}
        course={{
          id: course.id,
          slug: course.slug,
          published: course.published,
          scope: course.scope,
          title: (course.title as Record<string, string>) ?? {},
          description: (course.description as Record<string, string>) ?? {},
          course_settings: (course.course_settings as Record<string, unknown>) ?? {},
        }}
        initialModules={(modRows ?? []) as LearningModuleRow[]}
      />
    </AppShell>
  );
}
