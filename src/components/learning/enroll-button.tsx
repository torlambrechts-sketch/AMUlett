"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function EnrollButton({
  courseId,
  label,
}: {
  courseId: string;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function enroll() {
    setErr(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErr("Sign in required");
        setLoading(false);
        return;
      }
      const { error } = await supabase.from("learning_enrollments").upsert(
        { course_id: courseId, user_id: user.id },
        { onConflict: "course_id,user_id" }
      );
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      router.push(`/learning/course/${courseId}/learn`);
      router.refresh();
    } catch {
      setErr("Failed");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={enroll}
        disabled={loading}
        className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
      >
        {loading ? "…" : label}
      </button>
      {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
    </div>
  );
}
