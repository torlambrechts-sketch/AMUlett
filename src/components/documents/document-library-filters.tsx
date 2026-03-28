"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { LIBRARY_CATEGORIES } from "@/lib/documents/library-categories";

export function DocumentLibraryFilters() {
  const t = useTranslations("documents");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? "all";
  const cat = searchParams.get("cat") ?? "all";
  const sort = searchParams.get("sort") ?? "category";

  function apply(next: { q?: string; type?: string; cat?: string; sort?: string }) {
    const p = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, val: string | undefined) => {
      if (val === undefined || val === "" || val === "all") p.delete(key);
      else p.set(key, val);
    };
    setOrDelete("q", next.q !== undefined ? next.q : q);
    setOrDelete("type", next.type !== undefined ? next.type : type);
    setOrDelete("cat", next.cat !== undefined ? next.cat : cat);
    setOrDelete("sort", next.sort !== undefined ? next.sort : sort);
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("searchPlaceholder")}</label>
          <input
            defaultValue={q}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                apply({ q: (e.target as HTMLInputElement).value });
              }
            }}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
            name="lib-q"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("filterType")}</label>
          <select
            value={type}
            onChange={(e) => apply({ type: e.target.value })}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            <option value="all">{t("filterAll")}</option>
            <option value="wiki">{t("typeWiki")}</option>
            <option value="file">{t("typeFile")}</option>
          </select>
        </div>
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("libraryCategory")}</label>
          <select
            value={cat}
            onChange={(e) => apply({ cat: e.target.value })}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            <option value="all">{t("filterAllCategories")}</option>
            {LIBRARY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`category.${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">{t("sortBy")}</label>
          <select
            value={sort}
            onChange={(e) => apply({ sort: e.target.value })}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            <option value="category">{t("sortCategory")}</option>
            <option value="title">{t("sortTitle")}</option>
            <option value="updated">{t("sortUpdated")}</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>("[name='lib-q']");
            apply({ q: input?.value ?? "" });
          }}
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)]"
        >
          {t("search")}
        </button>
      </div>
    </div>
  );
}
