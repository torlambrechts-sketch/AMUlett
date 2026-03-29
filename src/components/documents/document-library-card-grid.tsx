import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocalized } from "@/lib/learning/localize";
import { DocumentFileDownloadButton } from "@/components/documents/document-file-download-button";
import { WikiDeleteButton } from "@/components/documents/wiki-delete-button";
import { DocumentFileDeleteButton } from "@/components/documents/document-file-delete-button";
import type { LibraryRow } from "@/components/documents/document-library-table";

function fileDisplayName(title: string, ext: string | null): string {
  if (ext) return `${title}.${ext}`;
  return title;
}

function formatBytes(n: number | null): string {
  if (n == null || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export async function DocumentLibraryCardGrid({
  spaceSlug,
  locale,
  rows,
  canWrite,
}: {
  spaceSlug: string;
  locale: string;
  rows: LibraryRow[];
  canWrite: boolean;
}) {
  const t = await getTranslations("documents");

  if (rows.length === 0) {
    return <p className="py-12 text-center text-sm text-[#6b7280]">{t("libraryEmpty")}</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        if (row.kind === "wiki") {
          const titleRes = resolveLocalized(row.title ?? {}, locale);
          const label = titleRes.text || row.slug;
          const desc = t("cardWikiBlurb");
          return (
            <article
              key={`w-${row.id}`}
              className="flex flex-col rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <span className="text-xs font-medium uppercase tracking-wide text-[#9ca3af]">{t("typeWiki")}</span>
              </div>
              <h3 className="line-clamp-2 text-base font-semibold text-[#111827]">{label}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[#6b7280]">{desc}</p>
              <div className="mt-4">
                <span className="text-xs text-[#6b7280]">{t("cardCategoryLabel")} </span>
                <span className="rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs font-medium text-[#374151]">
                  {t(`category.${row.category}`)}
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[#f3f4f6] pt-4">
                <Link
                  href={`/documents/s/${spaceSlug}/p/${row.slug}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f766e]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l3.667-7.361A1 1 0 0 1 6.64 3.64h10.72a1 1 0 0 1 .897.557l3.667 7.361a1.012 1.012 0 0 1 0 .639l-3.667 7.361a1 1 0 0 1-.897.557H6.639a1 1 0 0 1-.897-.557l-3.667-7.361Z" />
                  </svg>
                  {t("cardOpenWiki")}
                </Link>
                {canWrite ? (
                  <div className="flex w-full flex-col gap-2">
                    <Link href={`/documents/s/${spaceSlug}/p/${row.slug}/edit`} className="text-center text-sm font-medium text-[#0d9488] hover:underline">
                      {t("edit")}
                    </Link>
                    <WikiDeleteButton pageId={row.id} variant="link" />
                  </div>
                ) : null}
              </div>
            </article>
          );
        }

        const titleRes = resolveLocalized(row.title ?? {}, locale);
        const baseTitle = titleRes.text || t("untitledFile");
        const dlName = fileDisplayName(baseTitle, row.fileExt);
        const meta = [row.fileExt?.toUpperCase() ?? "—", formatBytes(row.fileSizeBytes)].join(" · ");

        return (
          <article
            key={`f-${row.id}`}
            className="flex flex-col rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <span className="text-xs font-medium uppercase tracking-wide text-[#9ca3af]">{t("typeFile")}</span>
            </div>
            <h3 className="line-clamp-2 text-base font-semibold text-[#111827]">{baseTitle}</h3>
            <p className="mt-2 line-clamp-2 text-sm text-[#6b7280]">{meta}</p>
            <div className="mt-4">
              <span className="text-xs text-[#6b7280]">{t("cardCategoryLabel")} </span>
              <span className="rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs font-medium text-[#374151]">
                {t(`category.${row.category}`)}
              </span>
            </div>
            <div className="mt-auto space-y-2 border-t border-[#f3f4f6] pt-4">
              <DocumentFileDownloadButton
                storagePath={row.storagePath}
                fileName={dlName}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d9488] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f766e] disabled:opacity-50"
                label={t("cardDownloadFiles")}
              />
              {canWrite ? <DocumentFileDeleteButton itemId={row.id} storagePath={row.storagePath} disabled={false} /> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
