import type { VideoContent } from "@/lib/learning/types";

export function VideoView({ content }: { content: VideoContent }) {
  const url = content.url?.trim();
  if (!url) {
    return <p className="text-sm text-[var(--color-text-muted)]">No video URL.</p>;
  }
  const isYoutube = /youtube\.com|youtu\.be/.test(url);
  const embed = isYoutube
    ? url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")
    : url;

  return (
    <div className="space-y-2">
      <div className="aspect-video w-full overflow-hidden rounded-[var(--radius-lg)] bg-black">
        {isYoutube ? (
          <iframe title="Video" src={embed} className="h-full w-full" allowFullScreen />
        ) : (
          <video controls className="h-full w-full" src={url}>
            <track kind="captions" />
          </video>
        )}
      </div>
      {content.caption ? (
        <p className="text-xs text-[var(--color-text-muted)]">{content.caption}</p>
      ) : null}
    </div>
  );
}
