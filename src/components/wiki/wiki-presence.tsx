"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Row = { user_id: string; last_seen_at: string; is_typing: boolean };

export function WikiPresenceBar({ pageId, organizationId }: { pageId: string; organizationId: string }) {
  const [others, setOthers] = useState<Row[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let timer: ReturnType<typeof setInterval>;

    async function beat(typing: boolean) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("wiki_page_presence").upsert(
        {
          page_id: pageId,
          user_id: user.id,
          organization_id: organizationId,
          last_seen_at: new Date().toISOString(),
          is_typing: typing,
        },
        { onConflict: "page_id,user_id" }
      );
    }

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const since = new Date(Date.now() - 60000).toISOString();
      const { data } = await supabase
        .from("wiki_page_presence")
        .select("user_id, last_seen_at, is_typing")
        .eq("page_id", pageId)
        .gte("last_seen_at", since);
      setOthers((data ?? []).filter((r) => r.user_id !== user?.id));
    }

    void beat(false);
    void load();
    const iv = setInterval(() => {
      void beat(false);
      void load();
    }, 8000);
    timer = iv;

    return () => {
      clearInterval(iv);
      void (async () => {
        const {
          data: { user: u },
        } = await supabase.auth.getUser();
        if (u) await supabase.from("wiki_page_presence").delete().eq("page_id", pageId).eq("user_id", u.id);
      })();
    };
  }, [pageId, organizationId]);

  if (others.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
      <span className="font-medium text-[var(--color-text)]">Active:</span>
      {others.map((o) => (
        <span key={o.user_id} className="rounded-full bg-[var(--color-surface)] px-2 py-0.5">
          {o.user_id.slice(0, 8)}…{o.is_typing ? " · typing" : ""}
        </span>
      ))}
    </div>
  );
}
