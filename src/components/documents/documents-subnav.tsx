"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

function pathWithoutLocale(pathname: string) {
  return pathname.replace(/^\/(en|nb)(?=\/|$)/, "") || "/";
}

export function DocumentsSubnav({
  spaceSlug,
  canWrite,
}: {
  spaceSlug: string | null;
  canWrite: boolean;
}) {
  const t = useTranslations("documents");
  const pathname = usePathname();
  const p = pathWithoutLocale(pathname);

  const isLibrary = p === "/documents";
  const isUnderSpace = p.startsWith("/documents/s/");
  const isNewPage = /\/documents\/s\/[^/]+\/new$/.test(p);
  /** Viewing or editing a wiki page (not hub, not new-page form). */
  const isWikiPage = isUnderSpace && !isNewPage;

  return (
    <nav
      className="flex w-[13.5rem] shrink-0 flex-col border-r border-[#e8eaed] bg-[#fafaf9] py-4"
      aria-label={t("subnavLabel")}
    >
      <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">{t("subnavSection")}</p>
      <ul className="flex flex-col gap-0.5 px-2">
        <li>
          <Link
            href="/documents"
            className={[
              "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isLibrary ? "bg-white text-[#2d8e52] shadow-sm" : "text-[#3d4248] hover:bg-white/80",
            ].join(" ")}
          >
            {isLibrary ? <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2d8e52]" aria-hidden /> : <span className="mr-2 w-1.5 shrink-0" />}
            {t("subnavLibrary")}
          </Link>
        </li>
        <li>
          <Link
            href="/documents#wiki-tree"
            className={[
              "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isWikiPage ? "bg-white text-[#2d8e52] shadow-sm" : "text-[#3d4248] hover:bg-white/80",
            ].join(" ")}
          >
            {isWikiPage ? (
              <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2d8e52]" aria-hidden />
            ) : (
              <span className="mr-2 w-1.5 shrink-0" />
            )}
            {t("subnavBrowse")}
          </Link>
        </li>
        {canWrite && spaceSlug ? (
          <li>
            <Link
              href={`/documents/s/${spaceSlug}/new`}
              className={[
                "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isNewPage ? "bg-white text-[#2d8e52] shadow-sm" : "text-[#3d4248] hover:bg-white/80",
              ].join(" ")}
            >
              {isNewPage ? <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2d8e52]" aria-hidden /> : <span className="mr-2 w-1.5 shrink-0" />}
              {t("newPage")}
            </Link>
          </li>
        ) : null}
      </ul>
      <div className="mt-auto border-t border-[#e8eaed] px-4 pt-4">
        <Link href="/settings" className="text-xs font-medium text-[#6b7280] hover:text-[#2d8e52]">
          {t("subnavSettings")}
        </Link>
      </div>
    </nav>
  );
}
