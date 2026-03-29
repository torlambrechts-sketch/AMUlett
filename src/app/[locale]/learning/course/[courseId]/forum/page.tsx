import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { LearningPdLayout } from "@/components/learning/learning-pd-layout";
import { Link } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrgContext } from "@/lib/org/server";
import { resolveLocalized } from "@/lib/learning/localize";
import { ForumTopicForm } from "@/components/learning/forum-topic-form";

type Props = { params: Promise<{ courseId: string }> };

export default async function CourseForumPage({ params }: Props) {
  const { courseId } = await params;
  const t = await getTranslations("lms");
  const locale = await getLocale();
  const org = await getUserOrgContext();
  const supabase = await createSupabaseServerClient();
  if (!supabase || !org) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/learning/course/${courseId}/forum`);

  const { data: course } = await supabase
    .from("learning_courses")
    .select("id, slug, title, published, scope, organization_id")
    .eq("id", courseId)
    .maybeSingle();

  if (!course?.published) notFound();

  const canAccess =
    course.scope === "system_default" ||
    (course.scope === "organization" && course.organization_id === org.organizationId);

  if (!canAccess) notFound();

  const { data: topics } = await supabase
    .from("learning_forum_topics")
    .select("id, title, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  const courseTitle = resolveLocalized(course.title as Record<string, string>, locale).text || course.slug;

  return (
    <AppShell title={`${courseTitle} — ${t("forumTitle")}`} learningLayout="iconRail" mainClassName="!p-0">
      <LearningPdLayout>
      <div className="mb-6">
        <Link href={`/learning/course/${courseId}/learn`} className="text-sm text-[var(--color-primary)] hover:underline">
          ← {t("backToCourse")}
        </Link>
      </div>

      <ForumTopicForm courseId={courseId} />

      <ul className="mt-8 divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        {(topics ?? []).length === 0 ? (
          <li className="p-4 text-sm text-[var(--color-text-muted)]">{t("noForumTopics")}</li>
        ) : (
          (topics ?? []).map((topic) => (
            <li key={topic.id} className="p-4">
              <p className="font-medium text-[var(--color-text)]">
                {resolveLocalized(topic.title as Record<string, string>, locale).text || t("untitledTopic")}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">{new Date(topic.created_at).toLocaleString()}</p>
            </li>
          ))
        )}
      </ul>
      </LearningPdLayout>
    </AppShell>
  );
}
