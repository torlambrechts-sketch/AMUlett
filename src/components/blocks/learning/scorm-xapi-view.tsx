export function ScormXapiView({
  content,
}: {
  content: { launchUrl?: string; packageType?: string; notes?: string };
}) {
  const url = content.launchUrl?.trim();
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <p className="text-sm font-medium text-[var(--color-text)]">SCORM / xAPI package</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        {content.packageType ?? "Package"} — full player integration typically uses an LRS and hosted launch URL.
      </p>
      {content.notes ? <p className="mt-2 text-sm text-[var(--color-text)]">{content.notes}</p> : null}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Launch content
        </a>
      ) : (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Set launchUrl in block JSON.</p>
      )}
    </div>
  );
}
