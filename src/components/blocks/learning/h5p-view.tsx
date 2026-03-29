export function H5pView({ content }: { content: { embedUrl?: string; title?: string } }) {
  const url = content.embedUrl?.trim();
  if (!url) {
    return <p className="text-sm text-[var(--color-text-muted)]">Add embedUrl (H5P embed or hosted player URL) in block JSON.</p>;
  }
  return (
    <div className="space-y-2">
      {content.title ? <p className="text-sm font-medium text-[var(--color-text)]">{content.title}</p> : null}
      <div className="aspect-video w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        <iframe title="H5P" src={url} className="h-full w-full" allowFullScreen />
      </div>
    </div>
  );
}
