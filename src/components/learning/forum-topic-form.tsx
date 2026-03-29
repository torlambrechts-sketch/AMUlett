"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ForumTopicForm({ courseId }: { courseId: string }) {
  const t = useTranslations("lms");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("learning_forum_topics").insert({
      course_id: courseId,
      title: { en: title },
      created_by: user.id,
    });
    setTitle("");
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[200px] flex-1">
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("newTopicTitle")}</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
      >
        {t("startTopic")}
      </button>
    </form>
  );
}
