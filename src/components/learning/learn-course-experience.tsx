"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { LearningBlockRenderer } from "@/components/blocks/learning/block-renderer";
import { MarkSectionComplete } from "@/components/learning/mark-section-complete";
import { isModuleReleased, releaseHint } from "@/lib/learning/release";
import type { LearningBlockType, LearningModuleRow } from "@/lib/learning/types";

export function LearnCourseExperience({
  courseId,
  organizationId,
  modules,
  enrolledAt,
  prereqBlocked,
  alreadyCompleted,
  certificate,
  gamificationEnabled,
}: {
  courseId: string;
  organizationId: string;
  modules: LearningModuleRow[];
  enrolledAt: string;
  prereqBlocked: { id: string; title: string; slug: string }[];
  alreadyCompleted: boolean;
  certificate: { issued_at: string; expires_at: string | null; pdf_storage_path: string | null } | null;
  gamificationEnabled: boolean;
}) {
  const t = useTranslations("lms");
  const router = useRouter();
  const [completed, setCompleted] = useState(alreadyCompleted);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const enrollDate = useMemo(() => new Date(enrolledAt), [enrolledAt]);

  async function completeCourse() {
    setBusy(true);
    setMsg(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("learning_course_completions").upsert(
        {
          user_id: user.id,
          course_id: courseId,
          organization_id: organizationId,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,course_id,organization_id" }
      );
      if (error) {
        setMsg(error.message);
        setBusy(false);
        return;
      }

      if (gamificationEnabled) {
        const { data: stats } = await supabase
          .from("learning_user_stats")
          .select("points, badges")
          .eq("user_id", user.id)
          .eq("organization_id", organizationId)
          .maybeSingle();
        const points = (stats?.points ?? 0) + 50;
        const badges = Array.isArray(stats?.badges) ? [...(stats.badges as unknown[])] : [];
        badges.push({ courseId, earnedAt: new Date().toISOString(), type: "course_complete" });
        await supabase.from("learning_user_stats").upsert(
          {
            user_id: user.id,
            organization_id: organizationId,
            points,
            badges,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,organization_id" }
        );
      }

      await supabase.from("learning_certificates").upsert(
        {
          user_id: user.id,
          course_id: courseId,
          organization_id: organizationId,
          issued_at: new Date().toISOString(),
          metadata: { note: "PDF generation can be added server-side" },
        },
        { onConflict: "user_id,course_id,organization_id" }
      );

      setCompleted(true);
      router.refresh();
    } catch {
      setMsg("Failed");
    } finally {
      setBusy(false);
    }
  }

  if (prereqBlocked.length > 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/30">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{t("prerequisitesRequired")}</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("completePrerequisitesFirst")}</p>
        <ul className="mt-4 space-y-2">
          {prereqBlocked.map((p) => (
            <li key={p.id}>
              <Link href={`/learning/course/${p.id}`} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {completed ? (
        <div className="rounded-[var(--radius-lg)] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <p className="font-medium text-emerald-900 dark:text-emerald-200">{t("courseCompleted")}</p>
          {certificate?.pdf_storage_path ? (
            <a href={certificate.pdf_storage_path} className="mt-2 inline-block text-sm text-[var(--color-primary)] hover:underline">
              {t("downloadCertificate")}
            </a>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("certificateRecorded")}</p>
          )}
          {gamificationEnabled ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("pointsAwarded")}</p> : null}
        </div>
      ) : null}

      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}

      {modules.map((mod, idx) => {
        const rule = (mod.release_rule ?? {}) as { after_enroll_days?: number; available_at?: string };
        const released = isModuleReleased(rule, enrollDate);
        const hint = releaseHint(rule, enrollDate);

        return (
          <article
            key={mod.id}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                {t("section")} {idx + 1}: {(mod.module_type as string).replace(/_/g, " ")}
              </h2>
              {released ? (
                <MarkSectionComplete organizationId={organizationId} moduleId={mod.id} label={t("markComplete")} />
              ) : null}
            </div>
            {!released ? (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] p-6 text-center">
                <p className="text-sm font-medium text-[var(--color-text)]">{t("contentLocked")}</p>
                {hint ? <p className="mt-2 text-xs text-[var(--color-text-muted)]">{hint}</p> : null}
              </div>
            ) : (
              <LearningBlockRenderer
                type={mod.module_type as LearningBlockType}
                content={(mod.content as Record<string, unknown>) ?? {}}
                courseId={courseId}
              />
            )}
          </article>
        );
      })}

      {!completed && modules.length > 0 ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={completeCourse}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
          >
            {busy ? "…" : t("markCourseComplete")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
