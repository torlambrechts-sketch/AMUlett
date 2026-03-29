"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolveLocalized } from "@/lib/learning/localize";

export function SurveyAdminList({
  surveys,
}: {
  surveys: { id: string; title: Record<string, string>; survey_type: string; status: string }[];
}) {
  const t = useTranslations("survey");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function publish(id: string) {
    setBusy(id);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("surveys").update({ status: "published" }).eq("id", id);
    setBusy(null);
    if (error) window.alert(error.message);
    else router.refresh();
  }

  async function closeSurvey(id: string) {
    setBusy(id);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("surveys").update({ status: "closed" }).eq("id", id);
    setBusy(null);
    if (error) window.alert(error.message);
    else router.refresh();
  }

  return (
    <ul className="space-y-3">
      {surveys.map((s) => {
        const title = resolveLocalized(s.title, locale).text;
        const typeLabel = s.survey_type === "pulse" ? t("type.pulse") : t("type.culture");
        return (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {typeLabel} · {s.status}
              </p>
            </div>
            <div className="flex gap-2">
              {s.status === "draft" ? (
                <button
                  type="button"
                  disabled={busy === s.id}
                  onClick={() => publish(s.id)}
                  className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {busy === s.id ? "…" : t("publish")}
                </button>
              ) : null}
              {s.status === "published" ? (
                <button
                  type="button"
                  disabled={busy === s.id}
                  onClick={() => closeSurvey(s.id)}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-sm"
                >
                  {t("closeSurvey")}
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
