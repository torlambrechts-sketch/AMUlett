import DOMPurify from "isomorphic-dompurify";
import { WikiMarkdown } from "@/components/wiki/wiki-markdown";
import type { WikiBlock } from "@/lib/wiki/types";

export function WikiBlockRenderer({ block, spaceSlug }: { block: WikiBlock; spaceSlug: string }) {
  switch (block.type) {
    case "text": {
      const html = block.html?.trim();
      if (html) {
        const safe = DOMPurify.sanitize(html, {
          ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "a", "blockquote", "code", "pre"],
          ALLOWED_ATTR: ["href", "target", "rel", "class"],
        });
        return (
          <div
            className="prose prose-sm max-w-none text-[var(--color-text)] [&_a]:text-[var(--color-primary)] [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: safe }}
          />
        );
      }
      return <WikiMarkdown source={block.content ?? ""} spaceSlug={spaceSlug} />;
    }
    case "callout": {
      const styles = {
        info: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100",
        warning: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
        tip: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100",
      }[block.variant];
      return (
        <aside className={`my-4 rounded-[var(--radius-lg)] border px-4 py-3 text-sm ${styles}`}>
          {block.title ? <p className="mb-1 font-semibold">{block.title}</p> : null}
          <WikiMarkdown source={block.body ?? ""} spaceSlug={spaceSlug} />
        </aside>
      );
    }
    case "code":
      return (
        <pre className="my-3 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 text-xs">
          <code className={block.language ? `language-${block.language}` : undefined}>{block.code}</code>
        </pre>
      );
    case "embed":
      return (
        <div className="my-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          {block.title ? <p className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-medium">{block.title}</p> : null}
          <iframe title={block.title ?? "embed"} src={block.url} className="aspect-video w-full min-h-[240px]" allowFullScreen />
        </div>
      );
    default:
      return null;
  }
}
