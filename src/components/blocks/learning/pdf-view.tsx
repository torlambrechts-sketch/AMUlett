export function PdfView({ content }: { content: { url?: string; title?: string } }) {
  const url = content.url?.trim();
  if (!url) {
    return <p className="text-sm text-[var(--color-text-muted)]">No PDF URL. Add a public URL or configure Supabase Storage.</p>;
  }
  return (
    <div className="space-y-2">
      {content.title ? <p className="text-sm font-medium text-[var(--color-text)]">{content.title}</p> : null}
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
        Open PDF
      </a>
      <iframe title="PDF" src={url} className="mt-2 h-[70vh] w-full rounded-[var(--radius-md)] border border-[var(--color-border)]" />
    </div>
  );
}
