"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { LIBRARY_CATEGORIES } from "@/lib/documents/library-categories";

export function DocumentLibraryChipFilters() {
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

  const chips: { key: string; cat: string }[] = [{ key: "all", cat: "all" }, ...LIBRARY_CATEGORIES.map((c) => ({ key: c, cat: c }))];

  return (
    <div className="mb-6 space-y-4">
      <div className="relative max-w-xl">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9ca3af]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
        </svg>
        <input
          type="search"
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply({ q: (e.target as HTMLInputElement).value });
          }}
          placeholder={t("hubSearchPlaceholder")}
          className="w-full rounded-full border border-[#e5e7eb] bg-[#f9fafb] py-2.5 pl-11 pr-4 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#0d9488] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20"
          name="hub-lib-q"
          aria-label={t("hubSearchPlaceholder")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {chips.map(({ key, cat: catVal }) => {
          const active = cat === catVal;
          return (
            <button
              key={key}
              type="button"
              onClick={() => apply({ cat: catVal })}
              className={[
                "rounded-full border px-4 py-2 text-sm font-medium transition",
                active
                  ? "border-[#1e3a5f] bg-[#1e3a5f] text-white shadow-sm"
                  : "border-[#e5e7eb] bg-white text-[#374151] hover:border-[#d1d5db]",
              ].join(" ")}
            >
              {catVal === "all" ? t("chipAll") : t(`category.${catVal}`)}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-[#6b7280]">
          <span>{t("filterType")}</span>
          <select
            value={type}
            onChange={(e) => apply({ type: e.target.value })}
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[#111827]"
          >
            <option value="all">{t("filterAll")}</option>
            <option value="wiki">{t("typeWiki")}</option>
            <option value="file">{t("typeFile")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-[#6b7280]">
          <span>{t("sortBy")}</span>
          <select
            value={sort}
            onChange={(e) => apply({ sort: e.target.value })}
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[#111827]"
          >
            <option value="category">{t("sortCategory")}</option>
            <option value="title">{t("sortTitle")}</option>
            <option value="updated">{t("sortUpdated")}</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>("[name='hub-lib-q']");
            apply({ q: input?.value ?? "" });
          }}
          className="rounded-lg bg-[#0d9488] px-4 py-1.5 font-medium text-white hover:bg-[#0f766e]"
        >
          {t("search")}
        </button>
      </div>
    </div>
  );
}
