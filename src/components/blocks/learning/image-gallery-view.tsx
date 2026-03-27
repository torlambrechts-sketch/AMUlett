import type { ImageGalleryContent } from "@/lib/learning/types";

export function ImageGalleryView({ content }: { content: ImageGalleryContent }) {
  const images = content.images?.length ? content.images : [];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {images.map((img, i) => (
        <figure key={i} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt={img.caption ?? ""} className="h-40 w-full object-cover" />
          {img.caption ? (
            <figcaption className="p-2 text-xs text-[var(--color-text-muted)]">{img.caption}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
