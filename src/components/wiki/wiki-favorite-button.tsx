"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function WikiFavoriteButton({ pageId, organizationId }: { pageId: string; organizationId: string }) {
  const t = useTranslations("documents");
  const router = useRouter();
  const [fav, setFav] = useState<boolean | null>(null);
  const [pin, setPin] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("wiki_page_favorites")
        .select("pinned")
        .eq("user_id", user.id)
        .eq("page_id", pageId)
        .maybeSingle();
      if (!cancelled) {
        setFav(!!data);
        setPin(data?.pinned ?? false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  async function toggle() {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    if (fav) {
      await supabase.from("wiki_page_favorites").delete().eq("user_id", user.id).eq("page_id", pageId);
      setFav(false);
    } else {
      await supabase.from("wiki_page_favorites").insert({
        user_id: user.id,
        page_id: pageId,
        organization_id: organizationId,
        pinned: false,
      });
      setFav(true);
    }
    setBusy(false);
    router.refresh();
  }

  async function togglePin() {
    if (!fav) return;
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const next = !pin;
    await supabase.from("wiki_page_favorites").update({ pinned: next }).eq("user_id", user.id).eq("page_id", pageId);
    setPin(next);
    setBusy(false);
    router.refresh();
  }

  if (fav === null) return null;

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={toggle}
        className="text-sm text-[var(--color-primary)] hover:underline disabled:opacity-50"
      >
        {fav ? t("removeFavorite") : t("addFavorite")}
      </button>
      {fav ? (
        <button type="button" disabled={busy} onClick={togglePin} className="text-xs text-[var(--color-text-muted)] hover:underline">
          {pin ? t("unpin") : t("pin")}
        </button>
      ) : null}
    </span>
  );
}
