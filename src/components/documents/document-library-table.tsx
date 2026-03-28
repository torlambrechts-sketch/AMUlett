import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocalized } from "@/lib/learning/localize";
import { DocumentFileDownloadButton } from "@/components/documents/document-file-download-button";
import { DocumentFileDeleteButton } from "@/components/documents/document-file-delete-button";
import { WikiDeleteButton } from "@/components/documents/wiki-delete-button";
import type { LibraryCategory } from "@/lib/documents/library-categories";

export type WikiLibraryRow = {
  kind: "wiki";
  id: string;
  slug: string;
  title: Record<string, string> | null;
  category: LibraryCategory;
  publishStatus: string;
  updatedAt: string | null;
};

export type FileLibraryRow = {
  kind: "file";
  id: string;
  title: Record<string, string> | null;
  category: LibraryCategory;
  fileExt: string | null;
  fileSizeBytes: number | null;
  storagePath: string;
  createdAt: string | null;
};

export type LibraryRow = WikiLibraryRow | FileLibraryRow;

function formatBytes(n: number | null): string {
  if (n == null || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileDisplayName(title: string, ext: string | null): string {
  if (ext) return `${title}.${ext}`;
  return title;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

export async function DocumentLibraryTable({
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

  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
            <th className="px-3 py-2.5 font-semibold text-[var(--color-text)]">{t("libraryColType")}</th>
            <th className="px-3 py-2.5 font-semibold text-[var(--color-text)]">{t("libraryColTitle")}</th>
            <th className="px-3 py-2.5 font-semibold text-[var(--color-text)]">{t("libraryCategory")}</th>
            <th className="px-3 py-2.5 font-semibold text-[var(--color-text)]">{t("libraryColDetails")}</th>
            <th className="px-3 py-2.5 font-semibold text-[var(--color-text)]">{t("libraryColActions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            if (row.kind === "wiki") {
              const titleRes = resolveLocalized(row.title ?? {}, locale);
              const label = titleRes.text || row.slug;
              return (
                <tr key={`w-${row.id}`} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-3 py-2.5 text-[var(--color-text-muted)]">{t("typeWiki")}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/documents/s/${spaceSlug}/p/${row.slug}`}
                      className="font-medium text-[var(--color-primary)] hover:underline"
                    >
                      {label}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-text-secondary)]">{t(`category.${row.category}`)}</td>
                  <td className="px-3 py-2.5 text-[var(--color-text-muted)]">
                    {row.publishStatus} · {formatDate(row.updatedAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <Link
                        href={`/documents/s/${spaceSlug}/p/${row.slug}`}
                        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                      >
                        {t("view")}
                      </Link>
                      {canWrite ? (
                        <Link
                          href={`/documents/s/${spaceSlug}/p/${row.slug}/edit`}
                          className="text-sm font-medium text-[var(--color-text-secondary)] hover:underline"
                        >
                          {t("edit")}
                        </Link>
                      ) : null}
                      {canWrite ? <WikiDeleteButton pageId={row.id} variant="link" /> : null}
                    </div>
                  </td>
                </tr>
              );
            }
            const titleRes = resolveLocalized(row.title ?? {}, locale);
            const baseTitle = titleRes.text || t("untitledFile");
            const dlName = fileDisplayName(baseTitle, row.fileExt);
            return (
              <tr key={`f-${row.id}`} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-3 py-2.5 text-[var(--color-text-muted)]">{t("typeFile")}</td>
                <td className="px-3 py-2.5 font-medium text-[var(--color-text)]">{baseTitle}</td>
                <td className="px-3 py-2.5 text-[var(--color-text-secondary)]">{t(`category.${row.category}`)}</td>
                <td className="px-3 py-2.5 text-[var(--color-text-muted)]">
                  {[row.fileExt?.toUpperCase() ?? "—", formatBytes(row.fileSizeBytes), formatDate(row.createdAt)].join(" · ")}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <DocumentFileDownloadButton storagePath={row.storagePath} fileName={dlName} />
                    {canWrite ? <DocumentFileDeleteButton itemId={row.id} storagePath={row.storagePath} disabled={false} /> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="px-3 py-8 text-center text-sm text-[var(--color-text-muted)]">{t("libraryEmpty")}</p>
      ) : null}
    </div>
  );
}
