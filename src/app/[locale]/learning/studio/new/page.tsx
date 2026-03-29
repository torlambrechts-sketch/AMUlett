import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { LearningPdLayout } from "@/components/learning/learning-pd-layout";
import { NewCourseForm } from "@/components/learning/new-course-form";

export default async function NewCoursePage() {
  const t = await getTranslations("lms");

  return (
    <AppShell title={t("newCourseTitle")} mainClassName="!p-0">
      <LearningPdLayout>
        <NewCourseForm />
      </LearningPdLayout>
    </AppShell>
  );
}
