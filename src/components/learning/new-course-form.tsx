"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { slugFromCourseTitles } from "@/lib/learning/slug";

export function NewCourseForm() {
  const t = useTranslations("lms");
  const router = useRouter();
  const [titleNb, setTitleNb] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [descNb, setDescNb] = useState("");
  const [descEn, setDescEn] = useState("");
  const [scope, setScope] = useState<"organization" | "system_default">("organization");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function slugExists(
    supabase: ReturnType<typeof createSupabaseBrowserClient>,
    slug: string,
    orgScope: "organization" | "system_default",
    organizationId: string | null
  ): Promise<boolean> {
    if (orgScope === "system_default") {
      const { data } = await supabase
        .from("learning_courses")
        .select("id")
        .eq("scope", "system_default")
        .eq("slug", slug)
        .maybeSingle();
      return !!data;
    }
    const { data } = await supabase
      .from("learning_courses")
      .select("id")
      .eq("scope", "organization")
      .eq("organization_id", organizationId!)
      .eq("slug", slug)
      .maybeSingle();
    return !!data;
  }

  async function pickUniqueSlug(
    supabase: ReturnType<typeof createSupabaseBrowserClient>,
    base: string,
    orgScope: "organization" | "system_default",
    organizationId: string | null
  ): Promise<string> {
    let candidate = base;
    for (let n = 0; n < 50; n++) {
      const exists = await slugExists(supabase, candidate, orgScope, organizationId);
      if (!exists) return candidate;
      candidate = `${base}-${n + 2}`;
    }
    return `${base}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErr("Not signed in");
        setLoading(false);
        return;
      }

      const { data: pa } = await supabase.rpc("has_platform_admin");
      if (scope === "system_default" && pa !== true) {
        setErr("Platform admin only");
        setLoading(false);
        return;
      }

      let organizationId: string | null = null;
      if (scope === "organization") {
        const { data: pref } = await supabase
          .from("user_preferences")
          .select("active_organization_id")
          .eq("user_id", user.id)
          .maybeSingle();
        organizationId = pref?.active_organization_id ?? null;
        if (!organizationId) {
          setErr("No active organization");
          setLoading(false);
          return;
        }
      }

      if (!titleNb.trim() && !titleEn.trim()) {
        setErr(t("titleRequired"));
        setLoading(false);
        return;
      }

      const baseSlug = slugFromCourseTitles(titleNb, titleEn);
      const slug = await pickUniqueSlug(supabase, baseSlug, scope, organizationId);

      const title: Record<string, string> = {};
      if (titleNb.trim()) title.nb = titleNb.trim();
      if (titleEn.trim()) title.en = titleEn.trim();

      const description: Record<string, string> = {};
      if (descNb.trim()) description.nb = descNb.trim();
      if (descEn.trim()) description.en = descEn.trim();

      const row = {
        slug,
        title,
        description,
        published: false,
        scope,
        organization_id: organizationId,
      };

      const { data, error } = await supabase.from("learning_courses").insert(row).select("id").single();
      if (error) {
        if (error.message.includes("scope") && error.message.includes("schema cache")) {
          setErr(t("errorSchemaCache"));
        } else {
          setErr(error.message);
        }
        setLoading(false);
        return;
      }
      router.push(`/learning/studio/${data.id}`);
      router.refresh();
    } catch {
      setErr("Failed");
      setLoading(false);
    }
  }

  return (
    <>
      <Link href="/learning/studio" className="mb-6 inline-block text-sm text-[var(--color-primary)] hover:underline">
        ← {t("backToStudio")}
      </Link>
      <form
        onSubmit={submit}
        className="max-w-lg space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]"
      >
        <p className="text-sm text-[var(--color-text-muted)]">{t("slugAutoHint")}</p>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("fieldTitleNb")}</label>
          <input
            value={titleNb}
            onChange={(e) => setTitleNb(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
            placeholder={t("titleNbPlaceholder")}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("fieldTitleEn")}</label>
          <input
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
            placeholder={t("titleEnPlaceholder")}
          />
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">{t("titlesOptional")}</p>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("fieldDescNb")}</label>
          <textarea
            value={descNb}
            onChange={(e) => setDescNb(e.target.value)}
            rows={2}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("fieldDescEn")}</label>
          <textarea
            value={descEn}
            onChange={(e) => setDescEn(e.target.value)}
            rows={2}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("fieldScope")}</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as "organization" | "system_default")}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            <option value="organization">{t("scopeCompany")}</option>
            <option value="system_default">{t("scopeSystem")}</option>
          </select>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t("scopeHelp")}</p>
        </div>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
        >
          {loading ? "…" : t("createCourse")}
        </button>
      </form>
    </>
  );
}
