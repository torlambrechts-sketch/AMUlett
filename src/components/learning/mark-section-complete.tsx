"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function MarkSectionComplete({
  organizationId,
  moduleId,
  label,
}: {
  organizationId: string;
  moduleId: string;
  label: string;
}) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function mark() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("learning_module_progress").upsert(
        {
          user_id: user.id,
          module_id: moduleId,
          organization_id: organizationId,
          state: { completed: true },
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module_id,organization_id" }
      );
      if (!error) setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Completed</p>;
  }

  return (
    <button
      type="button"
      onClick={mark}
      disabled={loading}
      className="text-sm font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
    >
      {loading ? "…" : label}
    </button>
  );
}
